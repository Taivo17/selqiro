\set ON_ERROR_STOP on

begin;

set local search_path = public, auth, pg_temp;

do $contract$
declare
  v_function_oid oid :=
    to_regprocedure(
      'public.get_my_marketplace_items_v1(integer,integer,text,text,uuid)'
    );
  v_legacy_oid oid :=
    to_regprocedure(
      'public.get_my_identity_listings(integer,integer,text,text,uuid)'
    );
  v_definition text;
  v_legacy_definition text;
  v_security_definer boolean;
  v_volatility "char";
  v_actual_output text[];
  v_expected_output constant text[] := array[
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
  if v_function_oid is null then
    raise exception
      'get_my_marketplace_items_v1_missing';
  end if;

  if v_legacy_oid is null then
    raise exception
      'legacy_get_my_identity_listings_missing';
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
  where proc.oid = v_function_oid;

  if not coalesce(v_security_definer, false) then
    raise exception
      'get_my_marketplace_items_v1_not_security_definer';
  end if;

  if v_volatility <> 's' then
    raise exception
      'get_my_marketplace_items_v1_not_stable:%',
      v_volatility;
  end if;

  select array_agg(
    proc.proargnames[argument.ordinal_position]
      || ':'
      || format_type(argument.type_oid, null)
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
  where proc.oid = v_function_oid
    and argument.argument_mode = 't';

  if v_actual_output is distinct from v_expected_output then
    raise exception
      'get_my_marketplace_items_v1_output_invalid: actual=%, expected=%',
      v_actual_output,
      v_expected_output;
  end if;

  if position(
    'marketplace_item_projection_v1'
    in v_definition
  ) = 0
    or position(
      'require_my_active_identity_v2'
      in v_definition
    ) = 0
    or position(
      'get_store_category_scope_ids'
      in v_definition
    ) = 0
    or position(
      'listing_store_categories'
      in v_definition
    ) = 0
  then
    raise exception
      'get_my_marketplace_items_v1_required_read_contract_missing';
  end if;

  if v_definition ~
      'insert[[:space:]]+into'
    or v_definition ~
      'update[[:space:]]+public\\.'
    or v_definition ~
      'delete[[:space:]]+from'
  then
    raise exception
      'get_my_marketplace_items_v1_contains_mutation';
  end if;

  select lower(pg_get_functiondef(v_legacy_oid))
  into v_legacy_definition;

  if position(
    'marketplace_item_projection_v1'
    in v_legacy_definition
  ) > 0 then
    raise exception
      'legacy_get_my_identity_listings_was_replaced';
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
    'public.marketplace_item_projection_v1',
    'SELECT'
  )
    or has_table_privilege(
      'anon',
      'public.marketplace_item_projection_v1',
      'SELECT'
    )
  then
    raise exception
      'projection_direct_client_access_widened';
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
    '00000000-0000-4000-8000-000000000801',
    'authenticated',
    'authenticated',
    'marketplace-owner-read@selqiro.local',
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
    '00000000-0000-4000-8000-000000000811',
    'authenticated',
    'authenticated',
    'marketplace-foreign-read@selqiro.local',
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
    '00000000-0000-4000-8000-000000000801',
    'marketplace-owner-read@selqiro.local'
  ),
  (
    '00000000-0000-4000-8000-000000000811',
    'marketplace-foreign-read@selqiro.local'
  )
on conflict (id)
do update
set email = excluded.email;

do $identities$
declare
  v_owner_identity_id uuid;
  v_foreign_identity_id uuid;
begin
  select identity.id
  into v_owner_identity_id
  from public.identities identity
  where identity.type = 'private'
    and identity.user_id =
      '00000000-0000-4000-8000-000000000801'
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
      '00000000-0000-4000-8000-000000000802',
      'private',
      '00000000-0000-4000-8000-000000000801',
      'Marketplace owner read test',
      'active',
      '00000000-0000-4000-8000-000000000801',
      '00000000-0000-4000-8000-000000000801'
    )
    returning id
    into v_owner_identity_id;
  end if;

  select identity.id
  into v_foreign_identity_id
  from public.identities identity
  where identity.type = 'private'
    and identity.user_id =
      '00000000-0000-4000-8000-000000000811'
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
      '00000000-0000-4000-8000-000000000812',
      'private',
      '00000000-0000-4000-8000-000000000811',
      'Marketplace foreign read test',
      'active',
      '00000000-0000-4000-8000-000000000811',
      '00000000-0000-4000-8000-000000000811'
    )
    returning id
    into v_foreign_identity_id;
  end if;

  update public.profiles
  set active_identity_id = v_owner_identity_id
  where id =
    '00000000-0000-4000-8000-000000000801';

  update public.profiles
  set active_identity_id = v_foreign_identity_id
  where id =
    '00000000-0000-4000-8000-000000000811';

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

do $categories_and_listings$
declare
  v_owner_identity_id uuid :=
    current_setting(
      'selqiro.test.owner_identity_id'
    )::uuid;
  v_foreign_identity_id uuid :=
    current_setting(
      'selqiro.test.foreign_identity_id'
    )::uuid;
  v_active_listing_id bigint;
  v_paused_listing_id bigint;
  v_sold_listing_id bigint;
  v_foreign_listing_id bigint;
begin
  insert into public.store_categories (
    id,
    user_id,
    identity_id,
    parent_id,
    name,
    sort_order
  )
  values
    (
      '00000000-0000-4000-8000-000000000803',
      '00000000-0000-4000-8000-000000000801',
      v_owner_identity_id,
      null,
      'Owner read root',
      0
    ),
    (
      '00000000-0000-4000-8000-000000000804',
      '00000000-0000-4000-8000-000000000801',
      v_owner_identity_id,
      '00000000-0000-4000-8000-000000000803',
      'Owner read child',
      0
    ),
    (
      '00000000-0000-4000-8000-000000000813',
      '00000000-0000-4000-8000-000000000811',
      v_foreign_identity_id,
      null,
      'Foreign read root',
      0
    );

  insert into public.listings (
    user_id,
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    title,
    description,
    price,
    price_amount,
    image,
    status,
    category,
    subcategory,
    condition,
    country,
    city,
    location,
    search_text,
    active_until,
    created_at
  )
  values (
    '00000000-0000-4000-8000-000000000801',
    v_owner_identity_id,
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'OWNER TRACTOR NEEDLE',
    'Owner active generic listing',
    '1200',
    1200,
    'https://example.com/owner-active.jpg',
    'active',
    'vehicles',
    'tractors',
    'used',
    'Estonia',
    'Paide',
    'Paide',
    'owner tractor needle active generic listing',
    now() + interval '30 days',
    timestamptz '2026-01-01 10:00:00+00'
  )
  returning id
  into v_active_listing_id;

  insert into public.listings (
    user_id,
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    title,
    description,
    price,
    status,
    category,
    condition,
    country,
    city,
    location,
    search_text,
    created_at
  )
  values (
    '00000000-0000-4000-8000-000000000801',
    v_owner_identity_id,
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'OWNER PAUSED NEEDLE',
    'Owner paused generic listing',
    '500',
    'paused',
    'general',
    'used',
    'Estonia',
    'Tartu',
    'Tartu',
    'owner paused needle generic listing',
    timestamptz '2026-01-01 09:00:00+00'
  )
  returning id
  into v_paused_listing_id;

  insert into public.listings (
    user_id,
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    title,
    description,
    price,
    status,
    category,
    condition,
    country,
    city,
    location,
    search_text,
    created_at
  )
  values (
    '00000000-0000-4000-8000-000000000801',
    v_owner_identity_id,
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000801',
    'OWNER SOLD NEEDLE',
    'Owner sold generic listing',
    '700',
    'sold',
    'general',
    'used',
    'Estonia',
    'Pärnu',
    'Pärnu',
    'owner sold needle generic listing',
    timestamptz '2026-01-01 08:00:00+00'
  )
  returning id
  into v_sold_listing_id;

  insert into public.listings (
    user_id,
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    title,
    description,
    price,
    status,
    category,
    condition,
    country,
    city,
    location,
    search_text,
    created_at
  )
  values (
    '00000000-0000-4000-8000-000000000811',
    v_foreign_identity_id,
    '00000000-0000-4000-8000-000000000811',
    '00000000-0000-4000-8000-000000000811',
    'FOREIGN LISTING NEEDLE',
    'Foreign generic listing',
    '999',
    'active',
    'general',
    'used',
    'Estonia',
    'Tallinn',
    'Tallinn',
    'foreign listing needle',
    timestamptz '2026-01-01 11:00:00+00'
  )
  returning id
  into v_foreign_listing_id;

  insert into public.listing_store_categories (
    listing_id,
    store_category_id
  )
  values (
    v_active_listing_id,
    '00000000-0000-4000-8000-000000000804'
  );

  perform set_config(
    'selqiro.test.active_listing_id',
    v_active_listing_id::text,
    true
  );
  perform set_config(
    'selqiro.test.paused_listing_id',
    v_paused_listing_id::text,
    true
  );
  perform set_config(
    'selqiro.test.sold_listing_id',
    v_sold_listing_id::text,
    true
  );
  perform set_config(
    'selqiro.test.foreign_listing_id',
    v_foreign_listing_id::text,
    true
  );
end;
$categories_and_listings$;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000801',
  true
);
select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated"}',
  true
);

set local role authenticated;

do $owner_horse$
declare
  v_offer public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type => 'sale',
    p_title => 'OWNER HORSE NEEDLE',
    p_description =>
      'Owner horse draft for marketplace read RPC test.',
    p_price_type => 'contact',
    p_horse_name => 'Owner test horse',
    p_city => 'Paide',
    p_region => 'Järvamaa'
  );

  if v_offer.identity_id <>
    current_setting(
      'selqiro.test.owner_identity_id'
    )::uuid
    or v_offer.status <> 'draft'
  then
    raise exception
      'owner_horse_fixture_invalid:%',
      row_to_json(v_offer);
  end if;

  perform set_config(
    'selqiro.test.owner_horse_id',
    v_offer.id::text,
    true
  );
end;
$owner_horse$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000811',
  true
);
select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000811","role":"authenticated"}',
  true
);

set local role authenticated;

do $foreign_horse$
declare
  v_offer public.horse_offers%rowtype;
begin
  select *
  into v_offer
  from public.save_my_horse_offer_draft_v1(
    p_offer_type => 'sale',
    p_title => 'FOREIGN HORSE NEEDLE',
    p_description =>
      'Foreign horse draft for identity isolation.',
    p_price_type => 'contact',
    p_horse_name => 'Foreign test horse',
    p_city => 'Tallinn',
    p_region => 'Harjumaa'
  );

  if v_offer.identity_id <>
    current_setting(
      'selqiro.test.foreign_identity_id'
    )::uuid
  then
    raise exception
      'foreign_horse_fixture_invalid:%',
      row_to_json(v_offer);
  end if;

  perform set_config(
    'selqiro.test.foreign_horse_id',
    v_offer.id::text,
    true
  );
end;
$foreign_horse$;

reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000801',
  true
);
select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated"}',
  true
);

set local role authenticated;

do $behavior$
declare
  v_count bigint;
  v_listing_count bigint;
  v_horse_count bigint;
  v_foreign_count bigint;
  v_row record;
begin
  select
    count(*),
    count(*) filter (
      where item.content_type = 'listing'
    ),
    count(*) filter (
      where item.content_type = 'horse_offer'
    )
  into
    v_count,
    v_listing_count,
    v_horse_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_result_offset => 0,
    p_status_filter => 'all',
    p_search_query => '',
    p_store_category_filter => null
  ) item;

  if v_count <> 4
    or v_listing_count <> 3
    or v_horse_count <> 1
  then
    raise exception
      'owner_all_result_invalid: total=%, listings=%, horses=%',
      v_count,
      v_listing_count,
      v_horse_count;
  end if;

  select count(*)
  into v_foreign_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100
  ) item
  where item.identity_id =
    current_setting(
      'selqiro.test.foreign_identity_id'
    )::uuid
    or item.content_id in (
      current_setting(
        'selqiro.test.foreign_listing_id'
      ),
      current_setting(
        'selqiro.test.foreign_horse_id'
      )
    );

  if v_foreign_count <> 0 then
    raise exception
      'foreign_identity_content_leaked:%',
      v_foreign_count;
  end if;

  select *
  into v_row
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_search_query => 'OWNER HORSE NEEDLE'
  ) item;

  if not found
    or v_row.content_type <> 'horse_offer'
    or v_row.content_id <>
      current_setting(
        'selqiro.test.owner_horse_id'
      )
    or v_row.source_status <> 'draft'
    or v_row.lifecycle_status <> 'draft'
    or v_row.content_variant <> 'sale'
  then
    raise exception
      'horse_search_mapping_invalid:%',
      row_to_json(v_row);
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_search_query => 'owner tractor needle'
  );

  if v_count <> 1 then
    raise exception
      'generic_search_invalid:%',
      v_count;
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_status_filter => 'active'
  );

  if v_count <> 1 then
    raise exception
      'active_filter_invalid:%',
      v_count;
  end if;

  select *
  into v_row
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_status_filter => 'sold'
  );

  if not found
    or v_row.content_type <> 'listing'
    or v_row.content_id <>
      current_setting(
        'selqiro.test.sold_listing_id'
      )
    or v_row.source_status <> 'sold'
    or v_row.lifecycle_status <> 'closed'
  then
    raise exception
      'sold_filter_alias_invalid:%',
      row_to_json(v_row);
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_status_filter => 'closed'
  );

  if v_count <> 1 then
    raise exception
      'closed_lifecycle_filter_invalid:%',
      v_count;
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_status_filter => 'draft'
  );

  if v_count <> 1 then
    raise exception
      'draft_filter_invalid:%',
      v_count;
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_store_category_filter =>
      '00000000-0000-4000-8000-000000000803'
  );

  if v_count <> 1 then
    raise exception
      'root_category_descendant_filter_invalid:%',
      v_count;
  end if;

  select *
  into v_row
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_store_category_filter =>
      '00000000-0000-4000-8000-000000000804'
  );

  if not found
    or v_row.content_type <> 'listing'
    or v_row.content_id <>
      current_setting(
        'selqiro.test.active_listing_id'
      )
  then
    raise exception
      'child_category_filter_invalid:%',
      row_to_json(v_row);
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_store_category_filter =>
      '00000000-0000-4000-8000-000000000813'
  );

  if v_count <> 0 then
    raise exception
      'foreign_category_filter_leaked:%',
      v_count;
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 1,
    p_result_offset => 0
  );

  if v_count <> 1 then
    raise exception
      'limit_contract_invalid:%',
      v_count;
  end if;

  select count(*)
  into v_count
  from public.get_my_marketplace_items_v1(
    p_result_limit => 100,
    p_result_offset => 4
  );

  if v_count <> 0 then
    raise exception
      'offset_contract_invalid:%',
      v_count;
  end if;
end;
$behavior$;

reset role;

rollback;
