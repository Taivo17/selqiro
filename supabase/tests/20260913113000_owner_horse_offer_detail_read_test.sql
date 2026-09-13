\set ON_ERROR_STOP on

begin;

set local search_path = public, auth, pg_temp;

do $contract$
declare
  v_function_oid oid :=
    to_regprocedure(
      'public.get_my_horse_offer_v1(uuid)'
    );
  v_definition text;
  v_security_definer boolean;
  v_volatility "char";
  v_actual_output text[];
  v_expected_output constant text[] := array[
    'content_type:text',
    'content_id:text',
    'offer_id:uuid',
    'identity_id:uuid',
    'offer_type:text',
    'status:text',
    'market_country_code:text',
    'horse_location_country_code:text',
    'title:text',
    'description:text',
    'price_amount:numeric',
    'price_type:text',
    'currency:text',
    'image_url:text',
    'horse_name:text',
    'birth_year:integer',
    'sex:text',
    'breed:text',
    'color:text',
    'height_cm:numeric',
    'discipline:text',
    'training_level:text',
    'suitability:text',
    'health_notes:text',
    'behavior_notes:text',
    'city:text',
    'region:text',
    'location_text:text',
    'horse_lat:double precision',
    'horse_lng:double precision',
    'details:jsonb',
    'published_at:timestamp with time zone',
    'held_at:timestamp with time zone',
    'paused_at:timestamp with time zone',
    'closed_at:timestamp with time zone',
    'rejected_at:timestamp with time zone',
    'archived_at:timestamp with time zone',
    'active_until:timestamp with time zone',
    'created_at:timestamp with time zone',
    'updated_at:timestamp with time zone',
    'images:jsonb'
  ]::text[];
begin
  if v_function_oid is null then
    raise exception
      'get_my_horse_offer_v1_missing';
  end if;

  select
    proc.prosecdef,
    proc.provolatile,
    lower(pg_get_functiondef(proc.oid))
  into
    v_security_definer,
    v_volatility,
    v_definition
  from pg_proc proc
  where proc.oid =
    v_function_oid;

  if not coalesce(
    v_security_definer,
    false
  ) then
    raise exception
      'get_my_horse_offer_v1_not_security_definer';
  end if;

  if v_volatility <> 's' then
    raise exception
      'get_my_horse_offer_v1_not_stable:%',
      v_volatility;
  end if;

  select array_agg(
    proc.proargnames[argument.ordinal_position]
      || ':'
      || format_type(
        argument.type_oid,
        null
      )
    order by argument.ordinal_position
  )
  into v_actual_output
  from pg_proc proc
  cross join lateral unnest(
    proc.proallargtypes,
    proc.proargmodes
  ) with ordinality as argument(
    type_oid,
    argument_mode,
    ordinal_position
  )
  where proc.oid =
    v_function_oid
    and argument.argument_mode =
      't';

  if v_actual_output is distinct from
    v_expected_output
  then
    raise exception
      'get_my_horse_offer_v1_output_invalid: actual=%, expected=%',
      v_actual_output,
      v_expected_output;
  end if;

  if position(
    'require_my_active_identity_v2'
    in v_definition
  ) = 0
    or position(
      'horse_offers'
      in v_definition
    ) = 0
    or position(
      'horse_offer_images'
      in v_definition
    ) = 0
  then
    raise exception
      'get_my_horse_offer_v1_required_read_contract_missing';
  end if;

  if position(
    'storage_path'
    in v_definition
  ) > 0
    or position(
      'uploaded_by_user_id'
      in v_definition
    ) > 0
    or position(
      'current_publication_event_id'
      in v_definition
    ) > 0
  then
    raise exception
      'get_my_horse_offer_v1_exposes_internal_image_or_publication_fields';
  end if;

  if v_definition ~
      'insert[[:space:]]+into'
    or v_definition ~
      'update[[:space:]]+public\\.'
    or v_definition ~
      'delete[[:space:]]+from'
  then
    raise exception
      'get_my_horse_offer_v1_contains_mutation';
  end if;

  if not has_function_privilege(
    'authenticated',
    v_function_oid,
    'EXECUTE'
  ) then
    raise exception
      'authenticated_execute_missing';
  end if;

  if has_function_privilege(
    'anon',
    v_function_oid,
    'EXECUTE'
  ) then
    raise exception
      'anon_execute_not_revoked';
  end if;

  if not has_function_privilege(
    'service_role',
    v_function_oid,
    'EXECUTE'
  ) then
    raise exception
      'service_role_execute_missing';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.horse_offers',
    'SELECT'
  )
    or has_table_privilege(
      'authenticated',
      'public.horse_offer_images',
      'SELECT'
    )
    or has_table_privilege(
      'anon',
      'public.horse_offers',
      'SELECT'
    )
    or has_table_privilege(
      'anon',
      'public.horse_offer_images',
      'SELECT'
    )
  then
    raise exception
      'direct_horse_table_read_privileges_widened';
  end if;
end;
$contract$;

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
    '00000000-0000-4000-8000-000000000901',
    'authenticated',
    'authenticated',
    'horse-detail-owner@selqiro.local',
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
    '00000000-0000-4000-8000-000000000911',
    'authenticated',
    'authenticated',
    'horse-detail-foreign@selqiro.local',
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
    '00000000-0000-4000-8000-000000000901',
    'horse-detail-owner@selqiro.local'
  ),
  (
    '00000000-0000-4000-8000-000000000911',
    'horse-detail-foreign@selqiro.local'
  )
on conflict (id)
do update
set email =
  excluded.email;

do $identities$
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
      '00000000-0000-4000-8000-000000000901'
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
      '00000000-0000-4000-8000-000000000902',
      'private',
      '00000000-0000-4000-8000-000000000901',
      'Horse detail owner',
      'active',
      '00000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000901'
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
      '00000000-0000-4000-8000-000000000911'
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
      '00000000-0000-4000-8000-000000000912',
      'private',
      '00000000-0000-4000-8000-000000000911',
      'Horse detail foreign',
      'active',
      '00000000-0000-4000-8000-000000000911',
      '00000000-0000-4000-8000-000000000911'
    )
    returning id
    into v_foreign_identity_id;
  end if;

  update public.profiles
  set active_identity_id =
    v_owner_identity_id
  where id =
    '00000000-0000-4000-8000-000000000901';

  update public.profiles
  set active_identity_id =
    v_foreign_identity_id
  where id =
    '00000000-0000-4000-8000-000000000911';

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
$identities$;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000901',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}',
  true
);

set local role authenticated;

do $create_owner_offer$
declare
  v_offer public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type =>
      'lease',
    p_title =>
      'Omaniku detaili testhobune',
    p_description =>
      'Täieliku omanikuvaate lugemislepingu test.',
    p_price_amount =>
      250,
    p_price_type =>
      'fixed',
    p_horse_name =>
      'Detailhobune',
    p_birth_year =>
      2015,
    p_sex =>
      'mare',
    p_breed =>
      'Eesti sporthobune',
    p_color =>
      'kõrb',
    p_height_cm =>
      165,
    p_discipline =>
      'koolisõit',
    p_training_level =>
      'Harrastaja',
    p_suitability =>
      'Sobib kogenud harrastajale.',
    p_health_notes =>
      'Avaldaja teada olev terviseinfo.',
    p_behavior_notes =>
      'Rahulik käsitlemisel.',
    p_city =>
      'Paide',
    p_region =>
      'Järvamaa',
    p_location_text =>
      'Privaatne talliala, värav 4',
    p_horse_lat =>
      58.885,
    p_horse_lng =>
      25.557,
    p_recurring_fee_period =>
      'month'
  );

  perform set_config(
    'selqiro.test.offer_id',
    v_offer.id::text,
    true
  );
end;
$create_owner_offer$;

reset role;

insert into public.horse_offer_images (
  id,
  horse_offer_id,
  identity_id,
  uploaded_by_user_id,
  original_url,
  medium_url,
  thumb_url,
  storage_path,
  sort_order,
  is_primary
)
values
  (
    '00000000-0000-4000-8000-000000000904',
    current_setting(
      'selqiro.test.offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.owner_identity_id'
    )::uuid,
    '00000000-0000-4000-8000-000000000901',
    'https://example.com/horse-detail-primary-original.jpg',
    'https://example.com/horse-detail-primary-medium.jpg',
    'https://example.com/horse-detail-primary-thumb.jpg',
    'owner/horse-detail/primary.jpg',
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000905',
    current_setting(
      'selqiro.test.offer_id'
    )::uuid,
    current_setting(
      'selqiro.test.owner_identity_id'
    )::uuid,
    '00000000-0000-4000-8000-000000000901',
    'https://example.com/horse-detail-secondary-original.jpg',
    'https://example.com/horse-detail-secondary-medium.jpg',
    'https://example.com/horse-detail-secondary-thumb.jpg',
    'owner/horse-detail/secondary.jpg',
    0,
    false
  );

update public.horse_offers offer
set image_url =
  'https://example.com/horse-detail-primary-medium.jpg'
where offer.id =
  current_setting(
    'selqiro.test.offer_id'
  )::uuid;

set local role authenticated;

do $owner_read$
declare
  v_detail record;
begin
  select *
  into v_detail
  from public.get_my_horse_offer_v1(
    current_setting(
      'selqiro.test.offer_id'
    )::uuid
  );

  if not found then
    raise exception
      'owner_detail_row_missing';
  end if;

  if v_detail.content_type <>
      'horse_offer'
    or v_detail.content_id <>
      current_setting(
        'selqiro.test.offer_id'
      )
    or v_detail.offer_id <>
      current_setting(
        'selqiro.test.offer_id'
      )::uuid
    or v_detail.identity_id <>
      current_setting(
        'selqiro.test.owner_identity_id'
      )::uuid
    or v_detail.offer_type <>
      'lease'
    or v_detail.status <>
      'draft'
    or v_detail.title <>
      'Omaniku detaili testhobune'
    or v_detail.location_text <>
      'Privaatne talliala, värav 4'
    or v_detail.horse_lat <>
      58.885
    or v_detail.horse_lng <>
      25.557
    or v_detail.details #>>
      '{recurring_fee,period}' <>
        'month'
    or jsonb_array_length(
      v_detail.images
    ) <> 2
    or v_detail.images -> 0 ->>
      'id' <>
        '00000000-0000-4000-8000-000000000904'
    or coalesce(
      (
        v_detail.images -> 0 ->>
          'is_primary'
      )::boolean,
      false
    ) is not true
    or v_detail.images -> 0 ->>
      'url' <>
        'https://example.com/horse-detail-primary-medium.jpg'
    or (
      v_detail.images -> 0
    ) ? 'storage_path'
    or (
      v_detail.images -> 0
    ) ? 'uploaded_by_user_id'
  then
    raise exception
      'owner_detail_contract_invalid:%',
      row_to_json(v_detail);
  end if;
end;
$owner_read$;

do $missing_read$
declare
  v_count integer;
begin
  select count(*)::integer
  into v_count
  from public.get_my_horse_offer_v1(
    '00000000-0000-4000-8000-000000000999'
  );

  if v_count <> 0 then
    raise exception
      'missing_offer_was_exposed';
  end if;
end;
$missing_read$;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000911',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000911","role":"authenticated"}',
  true
);

do $foreign_read$
declare
  v_count integer;
begin
  select count(*)::integer
  into v_count
  from public.get_my_horse_offer_v1(
    current_setting(
      'selqiro.test.offer_id'
    )::uuid
  );

  if v_count <> 0 then
    raise exception
      'foreign_active_identity_read_was_not_blocked';
  end if;
end;
$foreign_read$;

reset role;

update public.horse_offers offer
set
  status =
    'rejected',
  rejected_at =
    now()
where offer.id =
  current_setting(
    'selqiro.test.offer_id'
  )::uuid;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000901',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}',
  true
);

set local role authenticated;

do $rejected_owner_read$
declare
  v_status text;
  v_rejected_at timestamptz;
begin
  select
    detail.status,
    detail.rejected_at
  into
    v_status,
    v_rejected_at
  from public.get_my_horse_offer_v1(
    current_setting(
      'selqiro.test.offer_id'
    )::uuid
  ) detail;

  if v_status <>
      'rejected'
    or v_rejected_at is null
  then
    raise exception
      'rejected_owner_detail_not_readable';
  end if;
end;
$rejected_owner_read$;

reset role;

do $no_side_effects$
declare
  v_policy_acceptance_count integer;
  v_publication_event_count integer;
begin
  select count(*)::integer
  into v_policy_acceptance_count
  from public.user_publication_policy_acceptances acceptance
  where acceptance.user_id =
    '00000000-0000-4000-8000-000000000901';

  select count(*)::integer
  into v_publication_event_count
  from public.horse_offer_publication_events event
  where event.horse_offer_id =
    current_setting(
      'selqiro.test.offer_id'
    )::uuid;

  if v_policy_acceptance_count <> 0 then
    raise exception
      'owner_detail_read_created_policy_acceptance';
  end if;

  if v_publication_event_count <> 0 then
    raise exception
      'owner_detail_read_created_publication_event';
  end if;
end;
$no_side_effects$;

rollback;
