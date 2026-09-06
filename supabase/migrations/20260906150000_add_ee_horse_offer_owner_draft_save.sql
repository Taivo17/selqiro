begin;

/*
 * Authenticated owner draft-save contract for the Estonia horse-offer pilot.
 *
 * Important boundaries:
 * - resolves the acting user from auth.uid();
 * - resolves and authorizes the active identity in the database;
 * - creates or updates only draft/rejected offers owned by that active identity;
 * - validates the active horse-offer-ee policy as a capability contract;
 * - does not require or write publication-policy acceptance;
 * - does not persist factual publication confirmations;
 * - does not upload/register images;
 * - does not create publication events or publish;
 * - does not mutate Energy.
 *
 * Branch-specific fields that do not belong in the concrete horse columns are
 * stored in horse_offers.details using schema_version 1. The RPC constructs this
 * object itself so the browser cannot submit arbitrary unversioned details.
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
    'public.publication_policy_documents'
  ) is null then
    raise exception
      'publication_policy_documents foundation is required first.';
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
  public.save_my_horse_offer_draft_v1(
    p_offer_id uuid
      default null,
    p_offer_type text
      default null,
    p_market_country_code text
      default 'EE',
    p_horse_location_country_code text
      default 'EE',
    p_title text
      default '',
    p_description text
      default '',
    p_price_amount numeric
      default null,
    p_price_type text
      default 'contact',
    p_currency text
      default 'EUR',
    p_horse_name text
      default null,
    p_birth_year integer
      default null,
    p_sex text
      default null,
    p_breed text
      default null,
    p_color text
      default null,
    p_height_cm numeric
      default null,
    p_discipline text
      default null,
    p_training_level text
      default null,
    p_suitability text
      default null,
    p_health_notes text
      default null,
    p_behavior_notes text
      default null,
    p_city text
      default null,
    p_region text
      default null,
    p_location_text text
      default null,
    p_horse_lat double precision
      default null,
    p_horse_lng double precision
      default null,
    p_recurring_fee_period text
      default null,
    p_wanted_preferred_sex text
      default null,
    p_wanted_preferred_breed text
      default null,
    p_wanted_preferred_discipline text
      default null,
    p_wanted_preferred_training_level text
      default null,
    p_wanted_intended_use text
      default null,
    p_wanted_health_preferences text
      default null,
    p_wanted_behavior_preferences text
      default null,
    p_wanted_budget_mode text
      default 'contact',
    p_wanted_budget_amount numeric
      default null,
    p_wanted_city text
      default null,
    p_wanted_region text
      default null
  )
returns setof public.horse_offers
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_identity_id uuid;
  v_policy_document_id uuid;

  v_offer_type text :=
    lower(
      btrim(
        coalesce(
          p_offer_type,
          ''
        )
      )
    );

  v_market_country_code text :=
    upper(
      btrim(
        coalesce(
          p_market_country_code,
          ''
        )
      )
    );

  v_horse_location_country_code text :=
    upper(
      btrim(
        coalesce(
          p_horse_location_country_code,
          ''
        )
      )
    );

  v_title text :=
    regexp_replace(
      btrim(
        coalesce(
          p_title,
          ''
        )
      ),
      '[[:space:]]+',
      ' ',
      'g'
    );

  v_description text :=
    btrim(
      coalesce(
        p_description,
        ''
      )
    );

  v_price_amount numeric(12, 2) :=
    p_price_amount;

  v_price_type text :=
    lower(
      btrim(
        coalesce(
          p_price_type,
          'contact'
        )
      )
    );

  v_currency text :=
    upper(
      btrim(
        coalesce(
          p_currency,
          'EUR'
        )
      )
    );

  v_horse_name text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_horse_name,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_sex text :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_sex,
            ''
          )
        )
      ),
      ''
    );

  v_breed text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_breed,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_color text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_color,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_discipline text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_discipline,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_training_level text :=
    nullif(
      btrim(
        coalesce(
          p_training_level,
          ''
        )
      ),
      ''
    );

  v_suitability text :=
    nullif(
      btrim(
        coalesce(
          p_suitability,
          ''
        )
      ),
      ''
    );

  v_health_notes text :=
    nullif(
      btrim(
        coalesce(
          p_health_notes,
          ''
        )
      ),
      ''
    );

  v_behavior_notes text :=
    nullif(
      btrim(
        coalesce(
          p_behavior_notes,
          ''
        )
      ),
      ''
    );

  v_city text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_city,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_region text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_region,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_location_text text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_location_text,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_recurring_fee_period text :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_recurring_fee_period,
            ''
          )
        )
      ),
      ''
    );

  v_wanted_preferred_sex text :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_wanted_preferred_sex,
            ''
          )
        )
      ),
      ''
    );

  v_wanted_preferred_breed text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_wanted_preferred_breed,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_wanted_preferred_discipline text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_wanted_preferred_discipline,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_wanted_preferred_training_level text :=
    nullif(
      btrim(
        coalesce(
          p_wanted_preferred_training_level,
          ''
        )
      ),
      ''
    );

  v_wanted_intended_use text :=
    nullif(
      btrim(
        coalesce(
          p_wanted_intended_use,
          ''
        )
      ),
      ''
    );

  v_wanted_health_preferences text :=
    nullif(
      btrim(
        coalesce(
          p_wanted_health_preferences,
          ''
        )
      ),
      ''
    );

  v_wanted_behavior_preferences text :=
    nullif(
      btrim(
        coalesce(
          p_wanted_behavior_preferences,
          ''
        )
      ),
      ''
    );

  v_wanted_budget_mode text :=
    lower(
      btrim(
        coalesce(
          p_wanted_budget_mode,
          'contact'
        )
      )
    );

  v_wanted_budget_amount numeric(12, 2) :=
    p_wanted_budget_amount;

  v_wanted_city text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_wanted_city,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_wanted_region text :=
    nullif(
      regexp_replace(
        btrim(
          coalesce(
            p_wanted_region,
            ''
          )
        ),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_details jsonb;

  v_existing
    public.horse_offers%rowtype;

  v_offer_id uuid;
begin
  if v_user_id is null then
    raise exception
      'horse_offer_authentication_required'
      using errcode = '42501';
  end if;

  v_identity_id :=
    public.require_my_active_identity_v2();

  if (
    v_market_country_code <> 'EE'
    or v_horse_location_country_code <> 'EE'
  ) then
    raise exception
      'ee_horse_offer_market_required'
      using errcode = '22023';
  end if;

  if v_currency <> 'EUR' then
    raise exception
      'ee_horse_offer_currency_must_be_eur'
      using errcode = '22023';
  end if;

  if not (
    v_offer_type = any (
      array[
        'sale',
        'free_transfer',
        'lease',
        'co_rider',
        'wanted'
      ]::text[]
    )
  ) then
    raise exception
      'horse_offer_type_not_supported'
      using errcode = '22023';
  end if;

  select policy.id
  into v_policy_document_id
  from public.publication_policy_documents
    policy
  where policy.policy_key =
    'horse-offer-ee'
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
    and 'horse_offer' = any (
      policy.applies_to_content_types
    )
    and policy.metadata @>
      '{
        "market_country_code": "EE",
        "horse_location_country_code": "EE",
        "cross_border_flow": false
      }'::jsonb
    and coalesce(
      policy.metadata ->
        'supported_offer_types',
      '[]'::jsonb
    ) ? v_offer_type
  order by
    policy.effective_from desc,
    policy.id desc
  limit 1;

  if v_policy_document_id is null then
    raise exception
      'horse_offer_policy_not_active_or_type_unsupported'
      using errcode = '22023';
  end if;

  if char_length(v_title) > 140 then
    raise exception
      'horse_offer_title_too_long'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 5000 then
    raise exception
      'horse_offer_description_too_long'
      using errcode = '22023';
  end if;

  if v_horse_name is not null
    and char_length(v_horse_name) > 160
  then
    raise exception
      'horse_offer_horse_name_too_long'
      using errcode = '22023';
  end if;

  if v_breed is not null
    and char_length(v_breed) > 160
  then
    raise exception
      'horse_offer_breed_too_long'
      using errcode = '22023';
  end if;

  if v_color is not null
    and char_length(v_color) > 120
  then
    raise exception
      'horse_offer_color_too_long'
      using errcode = '22023';
  end if;

  if v_discipline is not null
    and char_length(v_discipline) > 240
  then
    raise exception
      'horse_offer_discipline_too_long'
      using errcode = '22023';
  end if;

  if v_training_level is not null
    and char_length(v_training_level) > 500
  then
    raise exception
      'horse_offer_training_level_too_long'
      using errcode = '22023';
  end if;

  if v_suitability is not null
    and char_length(v_suitability) > 2000
  then
    raise exception
      'horse_offer_suitability_too_long'
      using errcode = '22023';
  end if;

  if v_health_notes is not null
    and char_length(v_health_notes) > 3000
  then
    raise exception
      'horse_offer_health_notes_too_long'
      using errcode = '22023';
  end if;

  if v_behavior_notes is not null
    and char_length(v_behavior_notes) > 3000
  then
    raise exception
      'horse_offer_behavior_notes_too_long'
      using errcode = '22023';
  end if;

  if v_city is not null
    and char_length(v_city) > 160
  then
    raise exception
      'horse_offer_city_too_long'
      using errcode = '22023';
  end if;

  if v_region is not null
    and char_length(v_region) > 160
  then
    raise exception
      'horse_offer_region_too_long'
      using errcode = '22023';
  end if;

  if v_location_text is not null
    and char_length(v_location_text) > 300
  then
    raise exception
      'horse_offer_location_text_too_long'
      using errcode = '22023';
  end if;

  if (
    p_birth_year is not null
    and (
      p_birth_year < 1900
      or p_birth_year > 2100
    )
  ) then
    raise exception
      'horse_offer_birth_year_invalid'
      using errcode = '22023';
  end if;

  if (
    p_height_cm is not null
    and (
      p_height_cm < 1
      or p_height_cm > 300
    )
  ) then
    raise exception
      'horse_offer_height_invalid'
      using errcode = '22023';
  end if;

  if (
    v_sex is not null
    and not (
      v_sex = any (
        array[
          'mare',
          'gelding',
          'stallion',
          'unknown'
        ]::text[]
      )
    )
  ) then
    raise exception
      'horse_offer_sex_invalid'
      using errcode = '22023';
  end if;

  if (
    p_horse_lat is null
  ) is distinct from (
    p_horse_lng is null
  ) then
    raise exception
      'horse_offer_coordinate_pair_required'
      using errcode = '22023';
  end if;

  if p_horse_lat is not null
    and (
      p_horse_lat < -90
      or p_horse_lat > 90
    )
  then
    raise exception
      'horse_offer_latitude_invalid'
      using errcode = '22023';
  end if;

  if p_horse_lng is not null
    and (
      p_horse_lng < -180
      or p_horse_lng > 180
    )
  then
    raise exception
      'horse_offer_longitude_invalid'
      using errcode = '22023';
  end if;

  if v_price_amount is not null
    and (
      v_price_amount < 0
      or v_price_amount > 9999999999.99
    )
  then
    raise exception
      'horse_offer_price_invalid'
      using errcode = '22023';
  end if;

  if v_wanted_budget_amount is not null
    and (
      v_wanted_budget_amount < 0
      or v_wanted_budget_amount >
        9999999999.99
    )
  then
    raise exception
      'horse_offer_wanted_budget_invalid'
      using errcode = '22023';
  end if;

  if v_wanted_preferred_breed is not null
    and char_length(
      v_wanted_preferred_breed
    ) > 160
  then
    raise exception
      'horse_offer_wanted_breed_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_preferred_discipline is not null
    and char_length(
      v_wanted_preferred_discipline
    ) > 240
  then
    raise exception
      'horse_offer_wanted_discipline_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_preferred_training_level is not null
    and char_length(
      v_wanted_preferred_training_level
    ) > 500
  then
    raise exception
      'horse_offer_wanted_training_level_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_intended_use is not null
    and char_length(
      v_wanted_intended_use
    ) > 2000
  then
    raise exception
      'horse_offer_wanted_intended_use_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_health_preferences is not null
    and char_length(
      v_wanted_health_preferences
    ) > 3000
  then
    raise exception
      'horse_offer_wanted_health_preferences_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_behavior_preferences is not null
    and char_length(
      v_wanted_behavior_preferences
    ) > 3000
  then
    raise exception
      'horse_offer_wanted_behavior_preferences_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_city is not null
    and char_length(v_wanted_city) > 160
  then
    raise exception
      'horse_offer_wanted_city_too_long'
      using errcode = '22023';
  end if;

  if v_wanted_region is not null
    and char_length(v_wanted_region) > 160
  then
    raise exception
      'horse_offer_wanted_region_too_long'
      using errcode = '22023';
  end if;

  if (
    v_wanted_preferred_sex is not null
    and not (
      v_wanted_preferred_sex = any (
        array[
          'mare',
          'gelding',
          'stallion',
          'unknown'
        ]::text[]
      )
    )
  ) then
    raise exception
      'horse_offer_wanted_preferred_sex_invalid'
      using errcode = '22023';
  end if;

  if v_offer_type =
    'wanted'
  then
    if (
      v_horse_name is not null
      or p_birth_year is not null
      or v_sex is not null
      or v_breed is not null
      or v_color is not null
      or p_height_cm is not null
      or v_discipline is not null
      or v_training_level is not null
      or v_suitability is not null
      or v_health_notes is not null
      or v_behavior_notes is not null
      or v_city is not null
      or v_region is not null
      or v_location_text is not null
      or p_horse_lat is not null
      or p_horse_lng is not null
    ) then
      raise exception
        'horse_offer_wanted_specific_payload_invalid'
        using errcode = '22023';
    end if;

    if v_recurring_fee_period is not null then
      raise exception
        'horse_offer_wanted_recurring_period_invalid'
        using errcode = '22023';
    end if;

    if v_price_type <> 'contact'
      or v_price_amount is not null
    then
      raise exception
        'horse_offer_wanted_seller_price_invalid'
        using errcode = '22023';
    end if;

    if not (
      v_wanted_budget_mode = any (
        array[
          'maximum',
          'contact'
        ]::text[]
      )
    ) then
      raise exception
        'horse_offer_wanted_budget_mode_invalid'
        using errcode = '22023';
    end if;

    if (
      v_wanted_budget_mode = 'maximum'
      and v_wanted_budget_amount is null
    )
      or (
        v_wanted_budget_mode = 'contact'
        and v_wanted_budget_amount is not null
      )
    then
      raise exception
        'horse_offer_wanted_budget_contract_invalid'
        using errcode = '22023';
    end if;

    v_price_amount :=
      null;
    v_price_type :=
      'contact';

    v_details :=
      jsonb_build_object(
        'schema_version',
        1,
        'branch',
        'wanted',
        'wanted',
        jsonb_strip_nulls(
          jsonb_build_object(
            'preferred_sex',
            v_wanted_preferred_sex,
            'preferred_breed',
            v_wanted_preferred_breed,
            'preferred_discipline',
            v_wanted_preferred_discipline,
            'preferred_training_level',
            v_wanted_preferred_training_level,
            'intended_use',
            v_wanted_intended_use,
            'health_preferences',
            v_wanted_health_preferences,
            'behavior_preferences',
            v_wanted_behavior_preferences,
            'budget',
            jsonb_strip_nulls(
              jsonb_build_object(
                'mode',
                v_wanted_budget_mode,
                'amount',
                v_wanted_budget_amount,
                'currency',
                'EUR'
              )
            ),
            'search_area',
            jsonb_strip_nulls(
              jsonb_build_object(
                'country_code',
                'EE',
                'city_or_municipality',
                v_wanted_city,
                'region',
                v_wanted_region
              )
            )
          )
        )
      );
  else
    if (
      v_wanted_preferred_sex is not null
      or v_wanted_preferred_breed is not null
      or v_wanted_preferred_discipline is not null
      or v_wanted_preferred_training_level is not null
      or v_wanted_intended_use is not null
      or v_wanted_health_preferences is not null
      or v_wanted_behavior_preferences is not null
      or v_wanted_budget_amount is not null
      or v_wanted_city is not null
      or v_wanted_region is not null
      or v_wanted_budget_mode <> 'contact'
    ) then
      raise exception
        'horse_offer_specific_wanted_payload_invalid'
        using errcode = '22023';
    end if;

    if v_offer_type = any (
      array[
        'lease',
        'co_rider'
      ]::text[]
    ) then
      if v_recurring_fee_period is null
        or not (
          v_recurring_fee_period = any (
            array[
              'day',
              'week',
              'month',
              'agreed_period'
            ]::text[]
          )
        )
      then
        raise exception
          'horse_offer_recurring_period_required'
          using errcode = '22023';
      end if;
    elsif v_recurring_fee_period is not null then
      raise exception
        'horse_offer_recurring_period_not_allowed'
        using errcode = '22023';
    end if;

    if v_offer_type =
      'free_transfer'
    then
      if v_price_amount is not null then
        raise exception
          'horse_offer_free_transfer_amount_invalid'
          using errcode = '22023';
      end if;

      v_price_amount :=
        null;
      v_price_type :=
        'free';
    else
      if not (
        v_price_type = any (
          array[
            'fixed',
            'from',
            'contact'
          ]::text[]
        )
      ) then
        raise exception
          'horse_offer_price_type_invalid'
          using errcode = '22023';
      end if;

      if (
        v_price_type = 'contact'
        and v_price_amount is not null
      )
        or (
          v_price_type = any (
            array[
              'fixed',
              'from'
            ]::text[]
          )
          and v_price_amount is null
        )
      then
        raise exception
          'horse_offer_price_contract_invalid'
          using errcode = '22023';
      end if;
    end if;

    if v_offer_type = any (
      array[
        'lease',
        'co_rider'
      ]::text[]
    ) then
      v_details :=
        jsonb_build_object(
          'schema_version',
          1,
          'branch',
          'specific',
          'recurring_fee',
          jsonb_build_object(
            'period',
            v_recurring_fee_period
          )
        );
    else
      v_details :=
        jsonb_build_object(
          'schema_version',
          1,
          'branch',
          'specific'
        );
    end if;
  end if;

  if p_offer_id is null then
    insert into public.horse_offers (
      identity_id,
      created_by_user_id,
      updated_by_user_id,
      offer_type,
      status,
      market_country_code,
      horse_location_country_code,
      title,
      description,
      price_amount,
      price_type,
      currency,
      horse_name,
      birth_year,
      sex,
      breed,
      color,
      height_cm,
      discipline,
      training_level,
      suitability,
      health_notes,
      behavior_notes,
      city,
      region,
      location_text,
      horse_lat,
      horse_lng,
      details
    )
    values (
      v_identity_id,
      v_user_id,
      v_user_id,
      v_offer_type,
      'draft',
      v_market_country_code,
      v_horse_location_country_code,
      v_title,
      v_description,
      v_price_amount,
      v_price_type,
      v_currency,
      case
        when v_offer_type = 'wanted'
          then null
        else v_horse_name
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else p_birth_year
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_sex
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_breed
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_color
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else p_height_cm
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_discipline
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_training_level
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_suitability
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_health_notes
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_behavior_notes
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_city
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_region
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else v_location_text
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else p_horse_lat
      end,
      case
        when v_offer_type = 'wanted'
          then null
        else p_horse_lng
      end,
      v_details
    )
    returning id
    into v_offer_id;
  else
    select offer.*
    into v_existing
    from public.horse_offers offer
    where offer.id =
      p_offer_id
    for update;

    if not found
      or v_existing.identity_id <>
        v_identity_id
    then
      raise exception
        'horse_offer_not_found_or_forbidden'
        using errcode = '42501';
    end if;

    if not (
      v_existing.status = any (
        array[
          'draft',
          'rejected'
        ]::text[]
      )
    ) then
      raise exception
        'horse_offer_not_editable'
        using errcode = '55000';
    end if;

    update public.horse_offers offer
    set
      updated_by_user_id =
        v_user_id,
      offer_type =
        v_offer_type,
      status =
        'draft',
      market_country_code =
        v_market_country_code,
      horse_location_country_code =
        v_horse_location_country_code,
      title =
        v_title,
      description =
        v_description,
      price_amount =
        v_price_amount,
      price_type =
        v_price_type,
      currency =
        v_currency,
      horse_name =
        case
          when v_offer_type = 'wanted'
            then null
          else v_horse_name
        end,
      birth_year =
        case
          when v_offer_type = 'wanted'
            then null
          else p_birth_year
        end,
      sex =
        case
          when v_offer_type = 'wanted'
            then null
          else v_sex
        end,
      breed =
        case
          when v_offer_type = 'wanted'
            then null
          else v_breed
        end,
      color =
        case
          when v_offer_type = 'wanted'
            then null
          else v_color
        end,
      height_cm =
        case
          when v_offer_type = 'wanted'
            then null
          else p_height_cm
        end,
      discipline =
        case
          when v_offer_type = 'wanted'
            then null
          else v_discipline
        end,
      training_level =
        case
          when v_offer_type = 'wanted'
            then null
          else v_training_level
        end,
      suitability =
        case
          when v_offer_type = 'wanted'
            then null
          else v_suitability
        end,
      health_notes =
        case
          when v_offer_type = 'wanted'
            then null
          else v_health_notes
        end,
      behavior_notes =
        case
          when v_offer_type = 'wanted'
            then null
          else v_behavior_notes
        end,
      city =
        case
          when v_offer_type = 'wanted'
            then null
          else v_city
        end,
      region =
        case
          when v_offer_type = 'wanted'
            then null
          else v_region
        end,
      location_text =
        case
          when v_offer_type = 'wanted'
            then null
          else v_location_text
        end,
      horse_lat =
        case
          when v_offer_type = 'wanted'
            then null
          else p_horse_lat
        end,
      horse_lng =
        case
          when v_offer_type = 'wanted'
            then null
          else p_horse_lng
        end,
      details =
        v_details,
      current_publication_event_id =
        null,
      published_at =
        null,
      held_at =
        null,
      paused_at =
        null,
      closed_at =
        null,
      rejected_at =
        null,
      archived_at =
        null,
      active_until =
        null
    where offer.id =
      p_offer_id;

    v_offer_id :=
      p_offer_id;
  end if;

  return query
  select offer.*
  from public.horse_offers offer
  where offer.id =
    v_offer_id;
end;
$function$;

comment on function
  public.save_my_horse_offer_draft_v1(
    uuid,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    integer,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text
  )
is
  'Creates or updates one EE horse-offer draft for the authenticated user active identity. It preserves concrete-horse and wanted semantics separately, does not require policy acceptance, and never publishes.';

comment on column
  public.horse_offers.details
is
  'Versioned branch-specific horse-offer data. Draft-save schema version 1 stores recurring fee period or wanted preferences, budget and search area without mixing them into concrete horse columns.';

revoke all
on function
  public.save_my_horse_offer_draft_v1(
    uuid,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    integer,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text
  )
from public, anon;

grant execute
on function
  public.save_my_horse_offer_draft_v1(
    uuid,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    integer,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    double precision,
    double precision,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    text,
    text
  )
to authenticated, service_role;

commit;
