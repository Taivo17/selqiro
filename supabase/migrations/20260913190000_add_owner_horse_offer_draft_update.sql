begin;

-- Owner draft editing is an update-only contract, not a create/resubmit action.
-- Existing save/read RPCs, public reads, lifecycle and image policies stay intact.
do $preflight$
begin
  if to_regclass('public.horse_offers') is null
    or to_regprocedure('public.require_my_active_identity_v2()') is null
    or to_regprocedure('public.get_my_horse_offer_v1(uuid)') is null then
    raise exception 'horse_offer_owner_edit_foundation_required';
  end if;
end;
$preflight$;

-- A separate revision avoids timestamp precision and transaction-time ambiguity.
-- Its constant default does not update existing horse content or lifecycle fields.
alter table public.horse_offers
  add column edit_revision bigint not null default 1
  constraint horse_offers_edit_revision_check check (edit_revision >= 1);

create function public.advance_horse_offer_edit_revision_v1()
returns trigger language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if old.edit_revision = 9223372036854775807 then
    raise exception 'horse_offer_edit_revision_exhausted' using errcode = '54000';
  end if;
  new.edit_revision := old.edit_revision + 1;
  return new;
end;
$function$;

-- Includes legacy draft-save and trusted future writes, not just the new RPC.
create trigger trg_horse_offers_edit_revision_v1
before update on public.horse_offers for each row
execute function public.advance_horse_offer_edit_revision_v1();

create function public.get_my_horse_offer_edit_snapshot_v1(p_offer_id uuid)
returns table (offer jsonb, edit_revision text)
language sql stable security definer
set search_path = public, auth, pg_temp
as $function$
  select to_jsonb(detail), source.edit_revision::text
  from public.get_my_horse_offer_v1(p_offer_id) detail
  join public.horse_offers source
    on source.id = detail.offer_id and source.identity_id = detail.identity_id;
$function$;

-- Private pure helper: accepts only a closed set of scalar patch keys.
-- Missing key = preserve; explicit null = clear that optional field only.
-- There is no client-supplied details object, ownership, type, status or revision.
create function public.apply_horse_offer_draft_patch_v1(
  p_existing public.horse_offers, p_changes jsonb
)
returns public.horse_offers language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_next public.horse_offers := p_existing;
  v_columns jsonb := '{}'::jsonb;
  v_details jsonb := p_existing.details;
  v_key text;
  v_value jsonb;
  v_text text;
  v_number numeric;
  v_limit integer;
  v_path text[];
  v_common constant text[] := array['title', 'description'];
  v_specific constant text[] := array[
    'price_amount', 'price_type', 'horse_name', 'birth_year', 'sex', 'breed',
    'color', 'height_cm', 'discipline', 'training_level', 'suitability',
    'health_notes', 'behavior_notes', 'city', 'region'
  ];
  v_wanted constant text[] := array[
    'wanted_preferred_sex', 'wanted_preferred_breed', 'wanted_preferred_discipline',
    'wanted_preferred_training_level', 'wanted_intended_use',
    'wanted_health_preferences', 'wanted_behavior_preferences',
    'wanted_budget_mode', 'wanted_budget_amount', 'wanted_city', 'wanted_region'
  ];
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object'
    or p_changes = '{}'::jsonb or octet_length(p_changes::text) > 65536 then
    raise exception 'horse_offer_edit_patch_invalid' using errcode = '22023';
  end if;
  if v_details -> 'schema_version' is distinct from '1'::jsonb
    or v_details ->> 'branch' is distinct from
      (case when p_existing.offer_type = 'wanted' then 'wanted' else 'specific' end) then
    raise exception 'horse_offer_edit_shape_unsupported' using errcode = '22023';
  end if;
  if p_existing.offer_type = 'wanted' then
    if jsonb_typeof(v_details -> 'wanted') is distinct from 'object'
      or jsonb_typeof(v_details #> '{wanted,budget}') is distinct from 'object'
      or jsonb_typeof(v_details #> '{wanted,search_area}') is distinct from 'object'
      or v_details #>> '{wanted,budget,currency}' is distinct from 'EUR'
      or v_details #>> '{wanted,search_area,country_code}' is distinct from 'EE'
      or p_existing.price_type <> 'contact' or p_existing.price_amount is not null then
      raise exception 'horse_offer_edit_shape_unsupported' using errcode = '22023';
    end if;
  elsif p_existing.offer_type in ('lease', 'co_rider') then
    if jsonb_typeof(v_details -> 'recurring_fee') is distinct from 'object' then
      raise exception 'horse_offer_edit_shape_unsupported' using errcode = '22023';
    end if;
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_changes) loop
    if not (v_key = any(v_common)
      or (p_existing.offer_type <> 'wanted' and v_key = any(v_specific))
      or (p_existing.offer_type = 'wanted' and v_key = any(v_wanted))
      or (p_existing.offer_type in ('lease', 'co_rider')
        and v_key = 'recurring_fee_period')) then
      raise exception 'horse_offer_edit_field_not_allowed: %', v_key using errcode = '22023';
    end if;

    if v_key in ('birth_year', 'height_cm', 'price_amount', 'wanted_budget_amount') then
      if jsonb_typeof(v_value) not in ('number', 'null') then
        raise exception 'horse_offer_edit_number_required: %', v_key using errcode = '22023';
      end if;
      if v_value <> 'null'::jsonb then
        v_number := (v_value #>> '{}')::numeric;
        if (v_key = 'birth_year' and
              (v_number < 1900 or v_number > 2100 or v_number <> trunc(v_number)))
          or (v_key = 'height_cm' and
              (v_number < 1 or v_number > 300 or v_number <> round(v_number, 1)))
          or (v_key in ('price_amount', 'wanted_budget_amount') and
              (v_number < 0 or v_number > 9999999999.99
                or v_number <> round(v_number, 2))) then
          raise exception 'horse_offer_edit_number_invalid: %', v_key using errcode = '22023';
        end if;
      end if;
    else
      if jsonb_typeof(v_value) not in ('string', 'null') then
        raise exception 'horse_offer_edit_text_required: %', v_key using errcode = '22023';
      end if;
      v_text := btrim(v_value #>> '{}');
      if v_key in ('title', 'horse_name', 'breed', 'color', 'city', 'region',
        'wanted_preferred_breed', 'wanted_city', 'wanted_region') then
        v_text := regexp_replace(v_text, '[[:space:]]+', ' ', 'g');
      end if;
      if v_key in ('sex', 'price_type', 'wanted_preferred_sex',
        'wanted_budget_mode', 'recurring_fee_period') then
        v_text := lower(v_text);
      end if;
      if v_key in ('title', 'description', 'price_type', 'wanted_budget_mode', 'recurring_fee_period') then
        if v_text is null then
          raise exception 'horse_offer_edit_null_not_allowed: %', v_key using errcode = '22023';
        end if;
      else
        v_text := nullif(v_text, '');
      end if;
      if v_key in ('sex', 'wanted_preferred_sex') and v_text is not null
        and v_text not in ('mare', 'gelding', 'stallion', 'unknown') then
        raise exception 'horse_offer_edit_sex_invalid' using errcode = '22023';
      end if;
      v_limit := case v_key
        when 'wanted_preferred_breed' then 160
        when 'wanted_preferred_discipline' then 240
        when 'wanted_preferred_training_level' then 500
        when 'wanted_intended_use' then 2000
        when 'wanted_health_preferences' then 3000
        when 'wanted_behavior_preferences' then 3000
        when 'wanted_city' then 160 when 'wanted_region' then 160
        else 5000 end;
      if char_length(v_text) > v_limit then
        raise exception 'horse_offer_edit_text_too_long: %', v_key using errcode = '22023';
      end if;
      v_value := coalesce(to_jsonb(v_text), 'null'::jsonb);
    end if;

    v_path := case v_key
      when 'recurring_fee_period' then array['recurring_fee', 'period']
      when 'wanted_budget_mode' then array['wanted', 'budget', 'mode']
      when 'wanted_budget_amount' then array['wanted', 'budget', 'amount']
      when 'wanted_city' then array['wanted', 'search_area', 'city_or_municipality']
      when 'wanted_region' then array['wanted', 'search_area', 'region']
      else case when v_key = any(v_wanted)
        then array['wanted', substr(v_key, 8)] else null end end;
    if v_path is null then
      v_columns := v_columns || jsonb_build_object(v_key, v_value);
    elsif v_value = 'null'::jsonb then
      v_details := v_details #- v_path;
    else
      v_details := jsonb_set(v_details, v_path, v_value, true);
    end if;
  end loop;

  v_next := jsonb_populate_record(p_existing, v_columns);
  v_next.details := v_details;
  -- A locality change cannot leave a different stored precise location attached.
  -- Its future explicit reconciliation belongs to a separate private-location UI.
  if (v_next.city is distinct from p_existing.city or v_next.region is distinct from p_existing.region)
    and (p_existing.location_text is not null or p_existing.horse_lat is not null
      or p_existing.horse_lng is not null) then
    raise exception 'horse_offer_private_location_requires_separate_edit' using errcode = '22023';
  end if;
  if p_existing.offer_type in ('lease', 'co_rider') and
    coalesce(v_details #>> '{recurring_fee,period}', '')
      not in ('day', 'week', 'month', 'agreed_period') then
    raise exception 'horse_offer_recurring_period_required' using errcode = '22023';
  end if;
  if p_existing.offer_type = 'wanted' then
    v_text := v_details #>> '{wanted,budget,mode}';
    if v_text is null or v_text not in ('maximum', 'contact')
      or (v_text = 'maximum' and
        jsonb_typeof(v_details #> '{wanted,budget,amount}') is distinct from 'number')
      or (v_text = 'contact' and
        coalesce(v_details #> '{wanted,budget,amount}', 'null'::jsonb) <> 'null'::jsonb) then
      raise exception 'horse_offer_wanted_budget_contract_invalid' using errcode = '22023';
    end if;
    if v_text = 'maximum' then
      v_number := (v_details #>> '{wanted,budget,amount}')::numeric;
      if v_number < 0 or v_number > 9999999999.99 or v_number <> round(v_number, 2) then
        raise exception 'horse_offer_wanted_budget_contract_invalid' using errcode = '22023';
      end if;
    end if;
  end if;
  return v_next;
end;
$function$;

create function public.update_my_horse_offer_draft_v1(
  p_offer_id uuid, p_expected_edit_revision bigint, p_changes jsonb
)
returns table (offer_id uuid, edit_revision text, updated_at timestamptz)
language plpgsql security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_identity uuid;
  v_existing public.horse_offers;
  v_next public.horse_offers;
begin
  if v_actor is null then
    raise exception 'horse_offer_authentication_required' using errcode = '42501';
  end if;
  v_identity := public.require_my_active_identity_v2();
  if v_identity is null then
    raise exception 'horse_offer_not_found_or_forbidden' using errcode = '42501';
  end if;
  if p_offer_id is null or p_expected_edit_revision is null or p_expected_edit_revision < 1 then
    raise exception 'horse_offer_edit_identity_and_revision_required' using errcode = '22023';
  end if;
  -- Filter ownership before locking: a foreign ID cannot lock another identity's row.
  select source.* into v_existing from public.horse_offers source
  where source.id = p_offer_id and source.identity_id = v_identity for update;
  if not found then
    raise exception 'horse_offer_not_found_or_forbidden' using errcode = '42501';
  end if;
  if v_existing.status <> 'draft' then
    raise exception 'horse_offer_not_editable' using errcode = '55000';
  end if;
  if v_existing.edit_revision <> p_expected_edit_revision then
    raise exception 'horse_offer_edit_conflict' using errcode = '40001';
  end if;
  if v_existing.market_country_code <> 'EE' or v_existing.horse_location_country_code <> 'EE'
    or v_existing.currency <> 'EUR' then
    raise exception 'horse_offer_edit_market_unsupported' using errcode = '22023';
  end if;
  -- Same capability gate as draft creation; acceptance/publication is not performed.
  if not exists (
    select 1 from public.publication_policy_documents policy
    where policy.policy_key = 'horse-offer-ee' and policy.country_code = 'EE'
      and policy.locale = 'et-EE' and policy.status = 'active'
      and policy.effective_from <= now()
      and (policy.effective_until is null or policy.effective_until > now())
      and 'horse_offer' = any(policy.applies_to_content_types)
      and policy.metadata @> '{"market_country_code":"EE","horse_location_country_code":"EE","cross_border_flow":false}'::jsonb
      and coalesce(policy.metadata -> 'supported_offer_types', '[]'::jsonb) ? v_existing.offer_type
  ) then
    raise exception 'horse_offer_policy_not_active_or_type_unsupported' using errcode = '22023';
  end if;
  v_next := public.apply_horse_offer_draft_patch_v1(v_existing, p_changes);
  if v_next is not distinct from v_existing then
    return query select v_existing.id, v_existing.edit_revision::text, v_existing.updated_at;
    return;
  end if;
  -- Explicit update list: no status, type, ownership, lifecycle, image, exact location
  -- or arbitrary details replacement from a browser. Existing constraints validate
  -- scalar lengths, enums, price shape and numeric ranges atomically.
  return query
  update public.horse_offers source set
    updated_by_user_id = v_actor,
    title = v_next.title, description = v_next.description,
    price_amount = v_next.price_amount, price_type = v_next.price_type,
    horse_name = v_next.horse_name, birth_year = v_next.birth_year,
    sex = v_next.sex, breed = v_next.breed, color = v_next.color,
    height_cm = v_next.height_cm, discipline = v_next.discipline,
    training_level = v_next.training_level, suitability = v_next.suitability,
    health_notes = v_next.health_notes, behavior_notes = v_next.behavior_notes,
    city = v_next.city, region = v_next.region, details = v_next.details
  where source.id = p_offer_id and source.identity_id = v_identity
    and source.status = 'draft' and source.edit_revision = p_expected_edit_revision
  returning source.id, source.edit_revision::text, source.updated_at;
  if not found then
    raise exception 'horse_offer_edit_not_applied' using errcode = '40001';
  end if;
end;
$function$;

comment on column public.horse_offers.edit_revision is
  'Server-maintained optimistic edit revision. Returned as text to avoid JavaScript bigint precision loss; never supplied as a replacement value.';
comment on function public.get_my_horse_offer_edit_snapshot_v1(uuid) is
  'One-statement owner-safe detail plus matching edit revision. Existing detail read and its image minimization remain authoritative.';
comment on function public.update_my_horse_offer_draft_v1(uuid, bigint, jsonb) is
  'Updates an existing active-identity-owned draft using a required revision and whitelisted scalar patch. Does not create, resubmit, publish or modify images, policies or Energy.';

revoke all on function public.advance_horse_offer_edit_revision_v1() from public, anon, authenticated;
revoke all on function public.apply_horse_offer_draft_patch_v1(public.horse_offers, jsonb) from public, anon, authenticated;
revoke all on function public.get_my_horse_offer_edit_snapshot_v1(uuid) from public, anon;
revoke all on function public.update_my_horse_offer_draft_v1(uuid, bigint, jsonb) from public, anon;
grant execute on function public.get_my_horse_offer_edit_snapshot_v1(uuid) to authenticated, service_role;
grant execute on function public.update_my_horse_offer_draft_v1(uuid, bigint, jsonb) to authenticated, service_role;

commit;
