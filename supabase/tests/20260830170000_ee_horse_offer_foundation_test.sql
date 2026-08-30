\set ON_ERROR_STOP on

begin;

do $block$
declare
  v_owner_user_id uuid :=
    '00000000-0000-4000-8000-000000000501';
  v_foreign_user_id uuid :=
    '00000000-0000-4000-8000-000000000511';
  v_owner_identity_id uuid :=
    '00000000-0000-4000-8000-000000000502';
  v_foreign_identity_id uuid :=
    '00000000-0000-4000-8000-000000000512';

  v_general_policy
    public.publication_policy_documents%rowtype;
  v_horse_policy
    public.publication_policy_documents%rowtype;
  v_general_acceptance_id uuid;
  v_horse_acceptance_id uuid;

  v_offer_id uuid;
  v_second_offer_id uuid;
  v_image_id uuid;
  v_publication_event_id uuid;
  v_held_event_id uuid;

  v_snapshot jsonb;
  v_hash text;
  v_confirmation jsonb;
  v_rejected boolean;
  v_count integer;
  v_status text;
begin
  if to_regclass(
    'public.horse_offers'
  ) is null
    or to_regclass(
      'public.horse_offer_images'
    ) is null
    or to_regclass(
      'public.horse_offer_publication_events'
    ) is null
  then
    raise exception
      'Horse-offer foundation tables are missing.';
  end if;

  if to_regclass(
    'public.horse_offer_market_policies'
  ) is not null then
    raise exception
      'Duplicate horse_offer_market_policies table exists unexpectedly.';
  end if;

  select policy.*
  into v_general_policy
  from public.publication_policy_documents policy
  where policy.policy_key =
    'marketplace-general'
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
  limit 1;

  if not found then
    raise exception
      'Active marketplace general policy is missing.';
  end if;

  select policy.*
  into v_horse_policy
  from public.publication_policy_documents policy
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
  limit 1;

  if not found then
    raise exception
      'Active EE horse policy is missing.';
  end if;

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
      v_owner_user_id,
      'authenticated',
      'authenticated',
      'horse-foundation-owner@selqiro.local',
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
      v_foreign_user_id,
      'authenticated',
      'authenticated',
      'horse-foundation-foreign@selqiro.local',
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

  insert into public.identities (
    id,
    type,
    user_id,
    display_name,
    status,
    created_by,
    updated_by
  )
  values
    (
      v_owner_identity_id,
      'private',
      v_owner_user_id,
      'Horse foundation owner',
      'active',
      v_owner_user_id,
      v_owner_user_id
    ),
    (
      v_foreign_identity_id,
      'private',
      v_foreign_user_id,
      'Horse foundation foreign',
      'active',
      v_foreign_user_id,
      v_foreign_user_id
    )
  on conflict (id)
  do update
  set
    display_name =
      excluded.display_name,
    status =
      excluded.status;

  insert into public.user_publication_policy_acceptances (
    user_id,
    identity_id,
    policy_document_id,
    acceptance_source,
    metadata
  )
  values (
    v_owner_user_id,
    v_owner_identity_id,
    v_general_policy.id,
    'publication_gate',
    '{"test": true}'::jsonb
  )
  returning id
  into v_general_acceptance_id;

  insert into public.user_publication_policy_acceptances (
    user_id,
    identity_id,
    policy_document_id,
    acceptance_source,
    metadata
  )
  values (
    v_owner_user_id,
    v_owner_identity_id,
    v_horse_policy.id,
    'publication_gate',
    '{"test": true}'::jsonb
  )
  returning id
  into v_horse_acceptance_id;

  insert into public.horse_offers (
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    offer_type,
    status,
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
    v_owner_identity_id,
    v_owner_user_id,
    v_owner_user_id,
    'sale',
    'draft',
    'Testhobune otsib uut inimest',
    'Rahulik testhobune. See sisu on loodud ainult kohaliku andmebaasilepingu kontrollimiseks.',
    5000,
    'fixed',
    'EUR',
    'Testhobune',
    2014,
    'gelding',
    'Eesti sporthobune',
    'kõrb',
    168.0,
    'koolisõit',
    'harrastaja',
    'Sobib kogenud harrastajale.',
    'Oluline terviseinfo on avaldaja kirjelduse järgi lisatud.',
    'Rahulik käsitlemisel.',
    'Paide',
    'Järvamaa',
    'Täpne testasukoht, mida avalik leping ei tohi hiljem tagastada.',
    58.885,
    25.557,
    '{"test": true}'::jsonb
  )
  returning id
  into v_offer_id;

  select char_length(
    offer.search_vector::text
  )
  into v_count
  from public.horse_offers offer
  where offer.id =
    v_offer_id;

  if coalesce(v_count, 0) = 0 then
    raise exception
      'Horse-offer search vector was not generated.';
  end if;

  v_rejected :=
    false;

  begin
    insert into public.horse_offers (
      identity_id,
      created_by_user_id,
      offer_type,
      market_country_code,
      horse_location_country_code,
      price_type
    )
    values (
      v_owner_identity_id,
      v_owner_user_id,
      'sale',
      'FI',
      'FI',
      'contact'
    );
  exception
    when check_violation then
      v_rejected :=
        true;
  end;

  if not v_rejected then
    raise exception
      'Non-EE horse offer was not rejected.';
  end if;

  v_rejected :=
    false;

  begin
    insert into public.horse_offers (
      identity_id,
      created_by_user_id,
      offer_type,
      price_type,
      price_amount
    )
    values (
      v_owner_identity_id,
      v_owner_user_id,
      'free_transfer',
      'fixed',
      1
    );
  exception
    when check_violation then
      v_rejected :=
        true;
  end;

  if not v_rejected then
    raise exception
      'Invalid free-transfer price was not rejected.';
  end if;

  insert into public.horse_offer_images (
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
  values (
    v_offer_id,
    v_owner_identity_id,
    v_owner_user_id,
    'https://example.com/horse-original.jpg',
    'https://example.com/horse-medium.jpg',
    'https://example.com/horse-thumb.jpg',
    v_owner_user_id::text
      || '/'
      || v_offer_id::text
      || '/horse.jpg',
    0,
    true
  )
  returning id
  into v_image_id;

  update public.horse_offers offer
  set image_url =
    'https://example.com/horse-medium.jpg'
  where offer.id =
    v_offer_id;

  v_rejected :=
    false;

  begin
    insert into public.horse_offer_images (
      horse_offer_id,
      identity_id,
      uploaded_by_user_id,
      original_url,
      storage_path,
      sort_order,
      is_primary
    )
    values (
      v_offer_id,
      v_foreign_identity_id,
      v_foreign_user_id,
      'https://example.com/foreign.jpg',
      v_foreign_user_id::text
        || '/'
        || v_offer_id::text
        || '/foreign.jpg',
      1,
      false
    );
  exception
    when check_violation then
      if position(
        'horse_offer_image_identity_mismatch'
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
      'Cross-identity horse image was not rejected.';
  end if;

  v_rejected :=
    false;

  begin
    insert into public.horse_offer_images (
      horse_offer_id,
      identity_id,
      uploaded_by_user_id,
      original_url,
      storage_path,
      sort_order,
      is_primary
    )
    values (
      v_offer_id,
      v_owner_identity_id,
      v_owner_user_id,
      'https://example.com/second-primary.jpg',
      v_owner_user_id::text
        || '/'
        || v_offer_id::text
        || '/second-primary.jpg',
      1,
      true
    );
  exception
    when unique_violation then
      v_rejected :=
        true;
  end;

  if not v_rejected then
    raise exception
      'Second primary horse image was not rejected.';
  end if;

  v_snapshot :=
    public.build_horse_offer_content_snapshot_v1(
      v_offer_id
    );

  if jsonb_array_length(
    v_snapshot -> 'images'
  ) <> 1
    or v_snapshot ->>
      'offer_id' <>
        v_offer_id::text
  then
    raise exception
      'Canonical horse-offer content snapshot is incorrect: %',
      v_snapshot;
  end if;

  v_hash :=
    encode(
      extensions.digest(
        convert_to(
          v_snapshot::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  v_confirmation :=
    jsonb_build_object(
      'publisher_confirms_age_18_or_over',
      true,
      'publisher_confirms_information_accurate',
      true,
      'publisher_accepts_transaction_responsibility',
      true,
      'publisher_confirms_not_for_slaughter',
      true,
      'publisher_is_owner_or_authorized',
      true,
      'publisher_confirms_horse_identified',
      true,
      'publisher_confirms_passport_available',
      true
    );

  v_rejected :=
    false;

  begin
    insert into public.horse_offer_publication_events (
      horse_offer_id,
      identity_id,
      actor_user_id,
      submission_key,
      decision,
      general_policy_document_id,
      general_policy_version,
      general_policy_content_hash,
      general_acceptance_id,
      horse_policy_document_id,
      horse_policy_version,
      horse_policy_content_hash,
      horse_acceptance_id,
      confirmation_snapshot,
      content_snapshot,
      content_hash,
      risk_signals
    )
    values (
      v_offer_id,
      v_owner_identity_id,
      v_owner_user_id,
      '00000000-0000-4000-8000-000000000591',
      'published',
      v_general_policy.id,
      v_general_policy.policy_version,
      v_general_policy.content_hash,
      v_general_acceptance_id,
      v_horse_policy.id,
      v_horse_policy.policy_version,
      v_horse_policy.content_hash,
      v_horse_acceptance_id,
      v_confirmation -
        'publisher_is_owner_or_authorized',
      v_snapshot,
      v_hash,
      '{}'::text[]
    );
  exception
    when check_violation then
      if position(
        'horse_offer_specific_confirmations_invalid'
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
      'Missing concrete-horse confirmation was not rejected.';
  end if;

  v_rejected :=
    false;

  begin
    insert into public.horse_offer_publication_events (
      horse_offer_id,
      identity_id,
      actor_user_id,
      submission_key,
      decision,
      general_policy_document_id,
      general_policy_version,
      general_policy_content_hash,
      general_acceptance_id,
      horse_policy_document_id,
      horse_policy_version,
      horse_policy_content_hash,
      horse_acceptance_id,
      confirmation_snapshot,
      content_snapshot,
      content_hash,
      risk_signals
    )
    values (
      v_offer_id,
      v_owner_identity_id,
      v_owner_user_id,
      '00000000-0000-4000-8000-000000000592',
      'published',
      v_general_policy.id,
      v_general_policy.policy_version,
      v_general_policy.content_hash,
      v_general_acceptance_id,
      v_horse_policy.id,
      v_horse_policy.policy_version,
      v_horse_policy.content_hash,
      v_horse_acceptance_id,
      v_confirmation,
      v_snapshot,
      repeat('0', 64),
      '{}'::text[]
    );
  exception
    when check_violation then
      if position(
        'horse_offer_content_hash_mismatch'
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
      'Incorrect horse content hash was not rejected.';
  end if;

  insert into public.horse_offer_publication_events (
    horse_offer_id,
    identity_id,
    actor_user_id,
    submission_key,
    decision,
    general_policy_document_id,
    general_policy_version,
    general_policy_content_hash,
    general_acceptance_id,
    horse_policy_document_id,
    horse_policy_version,
    horse_policy_content_hash,
    horse_acceptance_id,
    confirmation_snapshot,
    content_snapshot,
    content_hash,
    risk_signals
  )
  values (
    v_offer_id,
    v_owner_identity_id,
    v_owner_user_id,
    '00000000-0000-4000-8000-000000000593',
    'published',
    v_general_policy.id,
    v_general_policy.policy_version,
    v_general_policy.content_hash,
    v_general_acceptance_id,
    v_horse_policy.id,
    v_horse_policy.policy_version,
    v_horse_policy.content_hash,
    v_horse_acceptance_id,
    v_confirmation,
    v_snapshot,
    v_hash,
    '{}'::text[]
  )
  returning id
  into v_publication_event_id;

  update public.horse_offers offer
  set
    status =
      'published',
    current_publication_event_id =
      v_publication_event_id,
    published_at =
      now(),
    active_until =
      now() + interval '30 days'
  where offer.id =
    v_offer_id;

  select offer.status
  into v_status
  from public.horse_offers offer
  where offer.id =
    v_offer_id;

  if v_status <> 'published' then
    raise exception
      'Horse offer did not enter published state.';
  end if;

  v_rejected :=
    false;

  begin
    update public.horse_offer_publication_events event
    set risk_signals =
      array['changed']::text[]
    where event.id =
      v_publication_event_id;
  exception
    when object_not_in_prerequisite_state then
      if position(
        'horse_offer_publication_event_append_only'
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
      'Publication event was mutable.';
  end if;

  insert into public.horse_offers (
    identity_id,
    created_by_user_id,
    updated_by_user_id,
    offer_type,
    status,
    title,
    description,
    price_type,
    currency,
    city,
    region,
    details
  )
  values (
    v_owner_identity_id,
    v_owner_user_id,
    v_owner_user_id,
    'wanted',
    'draft',
    'Otsin rahulikku harrastushobust',
    'Otsin sobivat harrastushobust Eestis. See on ainult kohaliku andmebaasilepingu riskitee test.',
    'contact',
    'EUR',
    'Tartu',
    'Tartumaa',
    '{"test": "held"}'::jsonb
  )
  returning id
  into v_second_offer_id;

  v_snapshot :=
    public.build_horse_offer_content_snapshot_v1(
      v_second_offer_id
    );

  v_hash :=
    encode(
      extensions.digest(
        convert_to(
          v_snapshot::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  v_confirmation :=
    jsonb_build_object(
      'publisher_confirms_age_18_or_over',
      true,
      'publisher_confirms_information_accurate',
      true,
      'publisher_accepts_transaction_responsibility',
      true,
      'publisher_confirms_not_for_slaughter',
      true
    );

  insert into public.horse_offer_publication_events (
    horse_offer_id,
    identity_id,
    actor_user_id,
    submission_key,
    decision,
    general_policy_document_id,
    general_policy_version,
    general_policy_content_hash,
    general_acceptance_id,
    horse_policy_document_id,
    horse_policy_version,
    horse_policy_content_hash,
    horse_acceptance_id,
    confirmation_snapshot,
    content_snapshot,
    content_hash,
    risk_signals
  )
  values (
    v_second_offer_id,
    v_owner_identity_id,
    v_owner_user_id,
    '00000000-0000-4000-8000-000000000594',
    'held_for_review',
    v_general_policy.id,
    v_general_policy.policy_version,
    v_general_policy.content_hash,
    v_general_acceptance_id,
    v_horse_policy.id,
    v_horse_policy.policy_version,
    v_horse_policy.content_hash,
    v_horse_acceptance_id,
    v_confirmation,
    v_snapshot,
    v_hash,
    array[
      'possible_slaughter_intent'
    ]::text[]
  )
  returning id
  into v_held_event_id;

  v_rejected :=
    false;

  begin
    update public.horse_offers offer
    set
      status =
        'published',
      current_publication_event_id =
        v_publication_event_id,
      published_at =
        now()
    where offer.id =
      v_second_offer_id;
  exception
    when check_violation then
      if position(
        'horse_offer_current_publication_event_invalid'
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
      'Cross-offer publication event pointer was not rejected.';
  end if;

  update public.horse_offers offer
  set
    status =
      'held_for_review',
    current_publication_event_id =
      v_held_event_id,
    held_at =
      now()
  where offer.id =
    v_second_offer_id;

  select offer.status
  into v_status
  from public.horse_offers offer
  where offer.id =
    v_second_offer_id;

  if v_status <> 'held_for_review' then
    raise exception
      'Horse offer did not enter held-for-review state.';
  end if;

  v_rejected :=
    false;

  begin
    insert into public.horse_offer_publication_events (
      horse_offer_id,
      identity_id,
      actor_user_id,
      submission_key,
      decision,
      general_policy_document_id,
      general_policy_version,
      general_policy_content_hash,
      general_acceptance_id,
      horse_policy_document_id,
      horse_policy_version,
      horse_policy_content_hash,
      horse_acceptance_id,
      confirmation_snapshot,
      content_snapshot,
      content_hash,
      risk_signals
    )
    select
      event.horse_offer_id,
      event.identity_id,
      event.actor_user_id,
      event.submission_key,
      event.decision,
      event.general_policy_document_id,
      event.general_policy_version,
      event.general_policy_content_hash,
      event.general_acceptance_id,
      event.horse_policy_document_id,
      event.horse_policy_version,
      event.horse_policy_content_hash,
      event.horse_acceptance_id,
      event.confirmation_snapshot,
      event.content_snapshot,
      event.content_hash,
      event.risk_signals
    from public.horse_offer_publication_events event
    where event.id =
      v_held_event_id;
  exception
    when unique_violation then
      v_rejected :=
        true;
  end;

  if not v_rejected then
    raise exception
      'Duplicate publication submission key was not rejected.';
  end if;

  select count(*)::integer
  into v_count
  from public.horse_offer_publication_events event
  where event.horse_offer_id =
    v_offer_id;

  if v_count <> 1 then
    raise exception
      'Unexpected publication event count for published offer: %',
      v_count;
  end if;
end;
$block$;

do $block$
declare
  v_table_name text;
  v_rls_enabled boolean;
  v_function_oid oid;
begin
  foreach v_table_name in array
    array[
      'horse_offers',
      'horse_offer_images',
      'horse_offer_publication_events'
    ]::text[]
  loop
    select relation.relrowsecurity
    into v_rls_enabled
    from pg_class relation
    join pg_namespace namespace
      on namespace.oid =
        relation.relnamespace
    where namespace.nspname =
      'public'
      and relation.relname =
        v_table_name;

    if coalesce(v_rls_enabled, false) is not true then
      raise exception
        'RLS is not enabled for public.%',
        v_table_name;
    end if;

    if has_table_privilege(
      'anon',
      'public.' || v_table_name,
      'SELECT'
    )
      or has_table_privilege(
        'authenticated',
        'public.' || v_table_name,
        'SELECT'
      )
      or has_table_privilege(
        'authenticated',
        'public.' || v_table_name,
        'INSERT'
      )
      or has_table_privilege(
        'authenticated',
        'public.' || v_table_name,
        'UPDATE'
      )
      or has_table_privilege(
        'authenticated',
        'public.' || v_table_name,
        'DELETE'
      )
    then
      raise exception
        'Ordinary role has unexpected direct privilege on public.%',
        v_table_name;
    end if;

    if not has_table_privilege(
      'service_role',
      'public.' || v_table_name,
      'SELECT,INSERT,UPDATE,DELETE'
    ) then
      raise exception
        'service_role is missing direct maintenance privileges on public.%',
        v_table_name;
    end if;
  end loop;

  select proc.oid
  into v_function_oid
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid =
      proc.pronamespace
  where namespace.nspname =
    'public'
    and proc.proname =
      'build_horse_offer_content_snapshot_v1';

  if v_function_oid is null then
    raise exception
      'Canonical horse-offer snapshot helper is missing.';
  end if;

  if has_function_privilege(
    'anon',
    v_function_oid,
    'EXECUTE'
  )
    or has_function_privilege(
      'authenticated',
      v_function_oid,
      'EXECUTE'
    )
  then
    raise exception
      'Ordinary role can execute the internal horse snapshot helper.';
  end if;
end;
$block$;

rollback;

select
  'EE_HORSE_OFFER_FOUNDATION_TEST=PASS' as result;
