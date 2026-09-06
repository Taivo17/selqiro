\set ON_ERROR_STOP on

begin;

do $block$
declare
  v_function_oid oid;
  v_function_count integer;
  v_is_security_definer boolean;
begin
  select count(*)::integer
  into v_function_count
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid =
      proc.pronamespace
  where namespace.nspname =
    'public'
    and proc.proname =
      'save_my_horse_offer_draft_v1';

  if v_function_count <> 1 then
    raise exception
      'Expected exactly one save_my_horse_offer_draft_v1 function, found %.',
      v_function_count;
  end if;

  select
    proc.oid,
    proc.prosecdef
  into
    v_function_oid,
    v_is_security_definer
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid =
      proc.pronamespace
  where namespace.nspname =
    'public'
    and proc.proname =
      'save_my_horse_offer_draft_v1';

  if v_function_oid is null then
    raise exception
      'save_my_horse_offer_draft_v1 OID was not resolved.';
  end if;

  if not coalesce(
    v_is_security_definer,
    false
  ) then
    raise exception
      'save_my_horse_offer_draft_v1 is not SECURITY DEFINER.';
  end if;

  if not has_function_privilege(
    'authenticated',
    v_function_oid,
    'EXECUTE'
  ) then
    raise exception
      'authenticated role cannot execute save_my_horse_offer_draft_v1.';
  end if;

  if has_function_privilege(
    'anon',
    v_function_oid,
    'EXECUTE'
  ) then
    raise exception
      'anon role can unexpectedly execute save_my_horse_offer_draft_v1.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.horse_offers',
    'INSERT'
  )
    or has_table_privilege(
      'authenticated',
      'public.horse_offers',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.horse_offers',
      'DELETE'
    )
  then
    raise exception
      'Authenticated direct horse_offers table mutation privileges were widened.';
  end if;
end;
$block$;

create temporary table
  horse_draft_test_state (
    key text primary key,
    value uuid not null
  )
on commit drop;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000601',
    'authenticated',
    'authenticated',
    'horse-draft-owner@selqiro.local',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000611',
    'authenticated',
    'authenticated',
    'horse-draft-foreign@selqiro.local',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id)
do nothing;

insert into public.profiles (
  id,
  email
)
values
  (
    '00000000-0000-4000-8000-000000000601',
    'horse-draft-owner@selqiro.local'
  ),
  (
    '00000000-0000-4000-8000-000000000611',
    'horse-draft-foreign@selqiro.local'
  )
on conflict (id)
do update
set email =
  excluded.email;

do $block$
declare
  v_owner_identity_id uuid;
  v_foreign_identity_id uuid;
begin
  select identity.id
  into v_owner_identity_id
  from public.identities identity
  where identity.type =
    'private'
    and identity.user_id =
      '00000000-0000-4000-8000-000000000601'
  order by identity.created_at
  limit 1;

  if v_owner_identity_id is null then
    insert into public.identities (
      id,
      type,
      user_id,
      display_name,
      status,
      created_by,
      updated_by
    )
    values (
      '00000000-0000-4000-8000-000000000602',
      'private',
      '00000000-0000-4000-8000-000000000601',
      'Horse draft owner',
      'active',
      '00000000-0000-4000-8000-000000000601',
      '00000000-0000-4000-8000-000000000601'
    )
    returning id
    into v_owner_identity_id;
  end if;

  select identity.id
  into v_foreign_identity_id
  from public.identities identity
  where identity.type =
    'private'
    and identity.user_id =
      '00000000-0000-4000-8000-000000000611'
  order by identity.created_at
  limit 1;

  if v_foreign_identity_id is null then
    insert into public.identities (
      id,
      type,
      user_id,
      display_name,
      status,
      created_by,
      updated_by
    )
    values (
      '00000000-0000-4000-8000-000000000612',
      'private',
      '00000000-0000-4000-8000-000000000611',
      'Horse draft foreign',
      'active',
      '00000000-0000-4000-8000-000000000611',
      '00000000-0000-4000-8000-000000000611'
    )
    returning id
    into v_foreign_identity_id;
  end if;

  update public.profiles
  set active_identity_id =
    v_owner_identity_id
  where id =
    '00000000-0000-4000-8000-000000000601';

  update public.profiles
  set active_identity_id =
    v_foreign_identity_id
  where id =
    '00000000-0000-4000-8000-000000000611';

  insert into horse_draft_test_state (
    key,
    value
  )
  values
    (
      'owner_identity_id',
      v_owner_identity_id
    ),
    (
      'foreign_identity_id',
      v_foreign_identity_id
    );

  perform set_config(
    'selqiro.test.owner_identity_id',
    v_owner_identity_id::text,
    true
  );

  perform set_config(
    'selqiro.test.foreign_identity_id',
    v_foreign_identity_id::text,
    true
  );
end;
$block$;

do $block$
declare
  v_count integer;
begin
  select count(*)::integer
  into v_count
  from public.user_publication_policy_acceptances
    acceptance
  where acceptance.user_id =
    '00000000-0000-4000-8000-000000000601';

  if v_count <> 0 then
    raise exception
      'Owner fixture unexpectedly has publication-policy acceptances.';
  end if;
end;
$block$;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000601',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',
  true
);

set local role authenticated;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type =>
      'sale',
    p_title =>
      '  Testhobune    müügiks  ',
    p_description =>
      '  Kohaliku owner-save lepingu test.  ',
    p_price_amount =>
      5000,
    p_price_type =>
      'fixed',
    p_horse_name =>
      '  Testhobune  ',
    p_birth_year =>
      2014,
    p_sex =>
      'gelding',
    p_breed =>
      '  Eesti   sporthobune  ',
    p_color =>
      'kõrb',
    p_height_cm =>
      168,
    p_discipline =>
      '  koolisõit  ',
    p_training_level =>
      'Harrastaja tasemel',
    p_suitability =>
      'Sobib kogenud harrastajale.',
    p_health_notes =>
      'Avaldaja teada olev terviseinfo.',
    p_behavior_notes =>
      'Rahulik käsitlemisel.',
    p_city =>
      '  Paide  ',
    p_region =>
      '  Järvamaa  ',
    p_location_text =>
      '  Omaniku privaatne   asukohatäpsustus  ',
    p_horse_lat =>
      58.885,
    p_horse_lng =>
      25.557
  );

  if v_offer.status <>
    'draft'
    or v_offer.identity_id <>
      current_setting(
        'selqiro.test.owner_identity_id'
      )::uuid
    or v_offer.created_by_user_id <>
      '00000000-0000-4000-8000-000000000601'
    or v_offer.updated_by_user_id <>
      '00000000-0000-4000-8000-000000000601'
    or v_offer.title <>
      'Testhobune müügiks'
    or v_offer.description <>
      'Kohaliku owner-save lepingu test.'
    or v_offer.horse_name <>
      'Testhobune'
    or v_offer.breed <>
      'Eesti sporthobune'
    or v_offer.city <>
      'Paide'
    or v_offer.region <>
      'Järvamaa'
    or v_offer.price_amount <>
      5000
    or v_offer.price_type <>
      'fixed'
    or v_offer.details <>
      '{
        "schema_version": 1,
        "branch": "specific"
      }'::jsonb
    or v_offer.current_publication_event_id
      is not null
    or v_offer.published_at is not null
    or v_offer.held_at is not null
    or char_length(
      v_offer.search_vector::text
    ) = 0
  then
    raise exception
      'Sale draft result is incorrect: %',
      row_to_json(v_offer);
  end if;

  perform set_config(
    'selqiro.test.sale_offer_id',
    v_offer.id::text,
    true
  );
end;
$block$;

reset role;

update public.horse_offers offer
set image_url =
  'https://example.com/existing-horse-image.jpg'
where offer.id =
  current_setting(
    'selqiro.test.sale_offer_id'
  )::uuid;

set local role authenticated;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_id =>
      current_setting(
        'selqiro.test.sale_offer_id'
      )::uuid,
    p_offer_type =>
      'sale',
    p_title =>
      'Uuendatud testhobune',
    p_description =>
      'Teine salvestus peab uuendama sama mustandit.',
    p_price_type =>
      'contact',
    p_horse_name =>
      'Testhobune',
    p_birth_year =>
      2014,
    p_sex =>
      'gelding',
    p_breed =>
      'Eesti sporthobune',
    p_city =>
      'Paide',
    p_region =>
      'Järvamaa'
  );

  if v_offer.id <>
    current_setting(
      'selqiro.test.sale_offer_id'
    )::uuid
    or v_offer.title <>
      'Uuendatud testhobune'
    or v_offer.price_type <>
      'contact'
    or v_offer.price_amount is not null
    or v_offer.image_url <>
      'https://example.com/existing-horse-image.jpg'
  then
    raise exception
      'Draft update did not preserve ID/image boundary: %',
      row_to_json(v_offer);
  end if;
end;
$block$;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type =>
      'lease',
    p_title =>
      'Hobune rendile',
    p_price_type =>
      'contact',
    p_recurring_fee_period =>
      'month',
    p_horse_name =>
      'Rendihobune',
    p_sex =>
      'mare',
    p_city =>
      'Tartu',
    p_region =>
      'Tartumaa'
  );

  if v_offer.offer_type <>
    'lease'
    or v_offer.price_type <>
      'contact'
    or v_offer.details #>>
      '{recurring_fee,period}' <>
        'month'
    or v_offer.details ->>
      'branch' <>
        'specific'
  then
    raise exception
      'Lease draft recurring-period contract is incorrect: %',
      row_to_json(v_offer);
  end if;

  perform set_config(
    'selqiro.test.lease_offer_id',
    v_offer.id::text,
    true
  );
end;
$block$;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type =>
      'wanted',
    p_title =>
      'Otsin rahulikku harrastushobust',
    p_description =>
      'Otsingukuulutuse eelistused jäävad konkreetsest hobusest eraldi.',
    p_wanted_preferred_sex =>
      'mare',
    p_wanted_preferred_breed =>
      'Eesti sporthobune',
    p_wanted_preferred_discipline =>
      'harrastus',
    p_wanted_preferred_training_level =>
      'turvaline harrastaja tase',
    p_wanted_intended_use =>
      'Täiskasvanud harrastajale metsas ja platsil sõitmiseks.',
    p_wanted_health_preferences =>
      'Sobib tavapärase harrastuskoormusega.',
    p_wanted_behavior_preferences =>
      'Rahulik käsitlemisel ja liikluses.',
    p_wanted_budget_mode =>
      'maximum',
    p_wanted_budget_amount =>
      4000,
    p_wanted_city =>
      'Tartu',
    p_wanted_region =>
      'Tartumaa'
  );

  if v_offer.offer_type <>
    'wanted'
    or v_offer.price_type <>
      'contact'
    or v_offer.price_amount is not null
    or v_offer.horse_name is not null
    or v_offer.birth_year is not null
    or v_offer.sex is not null
    or v_offer.breed is not null
    or v_offer.city is not null
    or v_offer.region is not null
    or v_offer.details ->>
      'branch' <>
        'wanted'
    or v_offer.details #>>
      '{wanted,preferred_sex}' <>
        'mare'
    or v_offer.details #>>
      '{wanted,budget,mode}' <>
        'maximum'
    or (
      v_offer.details #>>
        '{wanted,budget,amount}'
    )::numeric <> 4000
    or v_offer.details #>>
      '{wanted,search_area,city_or_municipality}' <>
        'Tartu'
    or v_offer.details #>>
      '{wanted,search_area,country_code}' <>
        'EE'
  then
    raise exception
      'Wanted draft branch separation is incorrect: %',
      row_to_json(v_offer);
  end if;

  perform set_config(
    'selqiro.test.wanted_offer_id',
    v_offer.id::text,
    true
  );
end;
$block$;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type =>
      'free_transfer',
    p_title =>
      'Hobune tasuta üleandmiseks',
    p_price_type =>
      'contact',
    p_horse_name =>
      'Tasuta testhobune',
    p_sex =>
      'unknown'
  );

  if v_offer.price_type <>
    'free'
    or v_offer.price_amount is not null
  then
    raise exception
      'Free-transfer price was not canonicalized safely: %',
      row_to_json(v_offer);
  end if;
end;
$block$;

reset role;

do $block$
declare
  v_count integer;
begin
  select count(*)::integer
  into v_count
  from public.horse_offers offer
  where offer.id =
    current_setting(
      'selqiro.test.sale_offer_id'
    )::uuid;

  if v_count <> 1 then
    raise exception
      'Second sale save created a duplicate row.';
  end if;

  select count(*)::integer
  into v_count
  from public.user_publication_policy_acceptances
    acceptance
  where acceptance.user_id =
    '00000000-0000-4000-8000-000000000601';

  if v_count <> 0 then
    raise exception
      'Draft save unexpectedly created policy acceptance.';
  end if;

  select count(*)::integer
  into v_count
  from public.horse_offer_publication_events
    event
  where event.horse_offer_id in (
    current_setting(
      'selqiro.test.sale_offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.lease_offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.wanted_offer_id'
    )::uuid
  );

  if v_count <> 0 then
    raise exception
      'Draft save unexpectedly created publication events.';
  end if;

  select count(*)::integer
  into v_count
  from public.horse_offer_images image
  where image.horse_offer_id in (
    current_setting(
      'selqiro.test.sale_offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.lease_offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.wanted_offer_id'
    )::uuid
  );

  if v_count <> 0 then
    raise exception
      'Draft save unexpectedly created image rows.';
  end if;
end;
$block$;

update public.horse_offers offer
set
  status =
    'rejected',
  rejected_at =
    now()
where offer.id =
  current_setting(
    'selqiro.test.sale_offer_id'
  )::uuid;

set local role authenticated;

do $block$
declare
  v_offer
    public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_id =>
      current_setting(
        'selqiro.test.sale_offer_id'
      )::uuid,
    p_offer_type =>
      'sale',
    p_title =>
      'Parandatud pärast tagasilükkamist',
    p_price_type =>
      'contact',
    p_horse_name =>
      'Testhobune'
  );

  if v_offer.status <>
    'draft'
    or v_offer.rejected_at is not null
    or v_offer.current_publication_event_id
      is not null
  then
    raise exception
      'Rejected draft was not reset safely: %',
      row_to_json(v_offer);
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'sale',
      p_market_country_code =>
        'FI',
      p_horse_location_country_code =>
        'FI',
      p_title =>
        'Vale riik'
    );
  exception
    when others then
      if position(
        'ee_horse_offer_market_required'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Non-EE draft was not rejected.';
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'sale',
      p_price_type =>
        'fixed',
      p_title =>
        'Puuduv hind'
    );
  exception
    when others then
      if position(
        'horse_offer_price_contract_invalid'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Fixed price without amount was not rejected.';
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'lease',
      p_title =>
        'Puuduv periood',
      p_price_type =>
        'contact'
    );
  exception
    when others then
      if position(
        'horse_offer_recurring_period_required'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Lease without recurring period was not rejected.';
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'wanted',
      p_title =>
        'Vigane otsing',
      p_horse_name =>
        'Olematu konkreetne hobune'
    );
  exception
    when others then
      if position(
        'horse_offer_wanted_specific_payload_invalid'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Wanted draft accepted concrete horse payload.';
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'sale',
      p_title =>
        'Vigane konkreetne pakkumine',
      p_wanted_preferred_breed =>
        'Eesti sporthobune'
    );
  exception
    when others then
      if position(
        'horse_offer_specific_wanted_payload_invalid'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Concrete draft accepted wanted-only payload.';
  end if;
end;
$block$;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_type =>
        'wanted',
      p_title =>
        'Vigane eelarve',
      p_wanted_budget_mode =>
        'maximum'
    );
  exception
    when others then
      if position(
        'horse_offer_wanted_budget_contract_invalid'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Wanted maximum budget without amount was not rejected.';
  end if;
end;
$block$;

reset role;

update public.horse_offers offer
set
  status =
    'archived',
  archived_at =
    now()
where offer.id =
  current_setting(
    'selqiro.test.lease_offer_id'
  )::uuid;

set local role authenticated;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_id =>
        current_setting(
          'selqiro.test.lease_offer_id'
        )::uuid,
      p_offer_type =>
        'lease',
      p_title =>
        'Arhiveeritud pakkumise muutmine',
      p_price_type =>
        'contact',
      p_recurring_fee_period =>
        'month'
    );
  exception
    when others then
      if position(
        'horse_offer_not_editable'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Archived horse offer was editable.';
  end if;
end;
$block$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000611',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000611","role":"authenticated"}',
  true
);

set local role authenticated;

do $block$
declare
  v_rejected boolean :=
    false;
begin
  begin
    perform *
    from public.save_my_horse_offer_draft_v1(
      p_offer_id =>
        current_setting(
          'selqiro.test.sale_offer_id'
        )::uuid,
      p_offer_type =>
        'sale',
      p_title =>
        'Võõra identiteedi muutmiskatse',
      p_price_type =>
        'contact'
    );
  exception
    when others then
      if position(
        'horse_offer_not_found_or_forbidden'
        in sqlerrm
      ) > 0 then
        v_rejected :=
          true;
      else
        raise;
      end if;
  end;

  if not v_rejected then
    raise exception
      'Foreign identity updated owner horse offer.';
  end if;
end;
$block$;

reset role;

rollback;
