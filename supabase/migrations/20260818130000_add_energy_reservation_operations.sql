begin;

create unique index
  energy_ledger_reserve_operation_key_idx
on public.energy_ledger_entries (
  operation_key
)
where event_type = 'reserve';

create unique index
  energy_ledger_final_operation_key_idx
on public.energy_ledger_entries (
  operation_key
)
where event_type in (
  'commit',
  'release'
);

comment on index
  public.energy_ledger_reserve_operation_key_idx
is
  'A reservation operation key is globally unique across all Energy wallets.';

comment on index
  public.energy_ledger_final_operation_key_idx
is
  'An Energy operation can have at most one global final event: commit or release.';


create or replace function
  public.user_has_identity_access_v2(
    p_user_id uuid,
    p_identity_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    p_user_id is not null
    and p_identity_id is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id =
        p_identity_id
        and identity.status =
          'active'
        and (
          (
            identity.type =
              'private'
            and identity.user_id =
              p_user_id
          )
          or
          (
            identity.type =
              'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id =
                  p_user_id
                and member.status =
                  'active'
            )
          )
        )
    );
$function$;

comment on function
  public.user_has_identity_access_v2(
    uuid,
    uuid
  )
is
  'Internal server helper that checks whether an explicit authenticated user owns or may use an active Selqiro identity.';

revoke all
on function
  public.user_has_identity_access_v2(
    uuid,
    uuid
  )
from public, anon, authenticated, service_role;


create or replace function
  public.require_user_active_identity_for_energy_v2(
    p_user_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_identity_id uuid;
begin
  if p_user_id is null then
    raise exception
      'energy_user_required'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_identity_id
  from public.profiles profile
  where profile.id =
    p_user_id
  for share;

  if not found then
    raise exception
      'energy_user_profile_missing'
      using errcode = '22023';
  end if;

  if v_identity_id is null then
    raise exception
      'energy_active_identity_missing'
      using errcode = '22023';
  end if;

  if not public.user_has_identity_access_v2(
    p_user_id,
    v_identity_id
  ) then
    raise exception
      'energy_active_identity_forbidden'
      using errcode = '42501';
  end if;

  return v_identity_id;
end;
$function$;

comment on function
  public.require_user_active_identity_for_energy_v2(
    uuid
  )
is
  'Internal server guard that locks and returns the verified user active identity for a new Energy reservation.';

revoke all
on function
  public.require_user_active_identity_for_energy_v2(
    uuid
  )
from public, anon, authenticated, service_role;


create or replace function
  public.reserve_user_energy_v2(
    p_user_id uuid,
    p_operation_key text,
    p_feature text,
    p_amount bigint,
    p_public_metadata jsonb
      default '{}'::jsonb,
    p_internal_metadata jsonb
      default '{}'::jsonb
  )
returns table (
  operation_key text,
  operation_status text,
  feature text,
  amount bigint,
  paid_amount bigint,
  bonus_amount bigint,
  wallet_id uuid,
  identity_id uuid,
  available_paid bigint,
  available_bonus bigint,
  available_total bigint,
  reserved_paid bigint,
  reserved_bonus bigint,
  reserved_total bigint,
  ledger_entry_id uuid,
  event_created_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_operation_key text :=
    btrim(
      coalesce(
        p_operation_key,
        ''
      )
    );

  v_feature text :=
    btrim(
      coalesce(
        p_feature,
        ''
      )
    );

  v_public_metadata jsonb :=
    coalesce(
      p_public_metadata,
      '{}'::jsonb
    );

  v_internal_metadata jsonb :=
    coalesce(
      p_internal_metadata,
      '{}'::jsonb
    );

  v_identity_id uuid;
  v_wallet public.energy_wallets%rowtype;
  v_reserve public.energy_ledger_entries%rowtype;
  v_final public.energy_ledger_entries%rowtype;
  v_event public.energy_ledger_entries%rowtype;
  v_paid_amount bigint;
  v_bonus_amount bigint;
  v_status text;
begin
  if p_user_id is null then
    raise exception
      'energy_user_required'
      using errcode = '22023';
  end if;

  if char_length(v_operation_key)
    not between 1 and 200
  then
    raise exception
      'energy_operation_key_invalid'
      using errcode = '22023';
  end if;

  if char_length(v_feature)
    not between 1 and 80
  then
    raise exception
      'energy_feature_invalid'
      using errcode = '22023';
  end if;

  if p_amount is null
    or p_amount <= 0
  then
    raise exception
      'energy_amount_invalid'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    v_public_metadata
  ) <> 'object'
    or jsonb_typeof(
      v_internal_metadata
    ) <> 'object'
  then
    raise exception
      'energy_metadata_invalid'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    73192,
    hashtext(v_operation_key)
  );

  select entry.*
  into v_reserve
  from public.energy_ledger_entries entry
  where entry.operation_key =
    v_operation_key
    and entry.event_type =
      'reserve'
  limit 1;

  if found then
    if (
      v_reserve.created_by_user_id
        is distinct from p_user_id
      and not public.user_has_identity_access_v2(
        p_user_id,
        v_reserve.identity_id
      )
    ) then
      raise exception
        'energy_operation_forbidden'
        using errcode = '42501';
    end if;

    select wallet.*
    into v_wallet
    from public.energy_wallets wallet
    where wallet.id =
      v_reserve.wallet_id
      and wallet.identity_id =
        v_reserve.identity_id
    for update;

    if not found then
      raise exception
        'energy_reservation_wallet_missing'
        using errcode = '23514';
    end if;

    v_paid_amount :=
      v_reserve.reserved_paid_delta;

    v_bonus_amount :=
      v_reserve.reserved_bonus_delta;

    if v_paid_amount < 0
      or v_bonus_amount < 0
      or (
        v_paid_amount +
        v_bonus_amount
      ) <= 0
      or v_reserve.available_paid_delta <>
        -v_paid_amount
      or v_reserve.available_bonus_delta <>
        -v_bonus_amount
    then
      raise exception
        'energy_reservation_corrupt'
        using errcode = '23514';
    end if;

    if v_reserve.feature <>
      v_feature
      or (
        v_paid_amount +
        v_bonus_amount
      ) <> p_amount
    then
      raise exception
        'energy_operation_key_conflict'
        using errcode = '23505';
    end if;

    select entry.*
    into v_final
    from public.energy_ledger_entries entry
    where entry.operation_key =
      v_operation_key
      and entry.event_type in (
        'commit',
        'release'
      )
    limit 1;

    if found then
      if v_final.wallet_id <>
        v_wallet.id
        or v_final.identity_id <>
          v_wallet.identity_id
      then
        raise exception
          'energy_final_event_corrupt'
          using errcode = '23514';
      end if;

      if v_final.event_type =
        'commit'
      then
        if v_final.available_paid_delta <> 0
          or v_final.available_bonus_delta <> 0
          or v_final.reserved_paid_delta <>
            -v_paid_amount
          or v_final.reserved_bonus_delta <>
            -v_bonus_amount
        then
          raise exception
            'energy_final_event_corrupt'
            using errcode = '23514';
        end if;

        v_status := 'committed';
      else
        if v_final.available_paid_delta <>
          v_paid_amount
          or v_final.available_bonus_delta <>
            v_bonus_amount
          or v_final.reserved_paid_delta <>
            -v_paid_amount
          or v_final.reserved_bonus_delta <>
            -v_bonus_amount
        then
          raise exception
            'energy_final_event_corrupt'
            using errcode = '23514';
        end if;

        v_status := 'released';
      end if;

      v_event := v_final;
    else
      v_status := 'reserved';
      v_event := v_reserve;
    end if;

    return query
    select
      v_operation_key,
      v_status,
      v_reserve.feature,
      (
        v_paid_amount +
        v_bonus_amount
      ),
      v_paid_amount,
      v_bonus_amount,
      v_wallet.id,
      v_wallet.identity_id,
      v_wallet.available_paid,
      v_wallet.available_bonus,
      (
        v_wallet.available_paid +
        v_wallet.available_bonus
      ),
      v_wallet.reserved_paid,
      v_wallet.reserved_bonus,
      (
        v_wallet.reserved_paid +
        v_wallet.reserved_bonus
      ),
      v_event.id,
      v_event.created_at,
      true;

    return;
  end if;

  if exists (
    select 1
    from public.energy_ledger_entries entry
    where entry.operation_key =
      v_operation_key
  ) then
    raise exception
      'energy_operation_key_conflict'
      using errcode = '23505';
  end if;

  v_identity_id :=
    public.require_user_active_identity_for_energy_v2(
      p_user_id
    );

  insert into public.energy_wallets (
    identity_id,
    created_by_user_id
  )
  values (
    v_identity_id,
    p_user_id
  )
  on conflict on constraint
    energy_wallets_identity_key
  do nothing;

  select wallet.*
  into v_wallet
  from public.energy_wallets wallet
  where wallet.identity_id =
    v_identity_id
  for update;

  if not found then
    raise exception
      'energy_wallet_missing'
      using errcode = 'P0002';
  end if;

  v_bonus_amount :=
    least(
      v_wallet.available_bonus,
      p_amount
    );

  v_paid_amount :=
    p_amount -
    v_bonus_amount;

  if v_paid_amount >
    v_wallet.available_paid
  then
    raise exception
      'energy_insufficient_balance'
      using errcode = 'P0001';
  end if;

  update public.energy_wallets wallet
  set
    available_paid =
      wallet.available_paid -
        v_paid_amount,
    available_bonus =
      wallet.available_bonus -
        v_bonus_amount,
    reserved_paid =
      wallet.reserved_paid +
        v_paid_amount,
    reserved_bonus =
      wallet.reserved_bonus +
        v_bonus_amount
  where wallet.id =
    v_wallet.id
  returning wallet.*
  into v_wallet;

  insert into public.energy_ledger_entries (
    wallet_id,
    identity_id,
    operation_key,
    event_type,
    feature,
    available_paid_delta,
    available_bonus_delta,
    reserved_paid_delta,
    reserved_bonus_delta,
    public_metadata,
    internal_metadata,
    created_by_user_id
  )
  values (
    v_wallet.id,
    v_wallet.identity_id,
    v_operation_key,
    'reserve',
    v_feature,
    -v_paid_amount,
    -v_bonus_amount,
    v_paid_amount,
    v_bonus_amount,
    v_public_metadata,
    v_internal_metadata,
    p_user_id
  )
  returning *
  into v_event;

  return query
  select
    v_operation_key,
    'reserved'::text,
    v_feature,
    p_amount,
    v_paid_amount,
    v_bonus_amount,
    v_wallet.id,
    v_wallet.identity_id,
    v_wallet.available_paid,
    v_wallet.available_bonus,
    (
      v_wallet.available_paid +
      v_wallet.available_bonus
    ),
    v_wallet.reserved_paid,
    v_wallet.reserved_bonus,
    (
      v_wallet.reserved_paid +
      v_wallet.reserved_bonus
    ),
    v_event.id,
    v_event.created_at,
    false;
end;
$function$;

comment on function
  public.reserve_user_energy_v2(
    uuid,
    text,
    text,
    bigint,
    jsonb,
    jsonb
  )
is
  'Service-role-only idempotent reservation. The server passes a verified user ID; the database selects and locks that user active identity wallet, consumes bonus before paid Energy, updates the wallet and appends one reserve event atomically.';

revoke all
on function
  public.reserve_user_energy_v2(
    uuid,
    text,
    text,
    bigint,
    jsonb,
    jsonb
  )
from public, anon, authenticated;

grant execute
on function
  public.reserve_user_energy_v2(
    uuid,
    text,
    text,
    bigint,
    jsonb,
    jsonb
  )
to service_role;


create or replace function
  public.commit_user_energy_v2(
    p_user_id uuid,
    p_operation_key text,
    p_public_metadata jsonb
      default '{}'::jsonb,
    p_internal_metadata jsonb
      default '{}'::jsonb
  )
returns table (
  operation_key text,
  operation_status text,
  feature text,
  amount bigint,
  paid_amount bigint,
  bonus_amount bigint,
  wallet_id uuid,
  identity_id uuid,
  available_paid bigint,
  available_bonus bigint,
  available_total bigint,
  reserved_paid bigint,
  reserved_bonus bigint,
  reserved_total bigint,
  ledger_entry_id uuid,
  event_created_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_operation_key text :=
    btrim(
      coalesce(
        p_operation_key,
        ''
      )
    );

  v_public_metadata jsonb :=
    coalesce(
      p_public_metadata,
      '{}'::jsonb
    );

  v_internal_metadata jsonb :=
    coalesce(
      p_internal_metadata,
      '{}'::jsonb
    );

  v_wallet public.energy_wallets%rowtype;
  v_reserve public.energy_ledger_entries%rowtype;
  v_final public.energy_ledger_entries%rowtype;
  v_event public.energy_ledger_entries%rowtype;
  v_paid_amount bigint;
  v_bonus_amount bigint;
begin
  if p_user_id is null then
    raise exception
      'energy_user_required'
      using errcode = '22023';
  end if;

  if char_length(v_operation_key)
    not between 1 and 200
  then
    raise exception
      'energy_operation_key_invalid'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    v_public_metadata
  ) <> 'object'
    or jsonb_typeof(
      v_internal_metadata
    ) <> 'object'
  then
    raise exception
      'energy_metadata_invalid'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    73192,
    hashtext(v_operation_key)
  );

  select entry.*
  into v_reserve
  from public.energy_ledger_entries entry
  where entry.operation_key =
    v_operation_key
    and entry.event_type =
      'reserve'
  limit 1;

  if not found then
    raise exception
      'energy_reservation_missing'
      using errcode = 'P0002';
  end if;

  if (
    v_reserve.created_by_user_id
      is distinct from p_user_id
    and not public.user_has_identity_access_v2(
      p_user_id,
      v_reserve.identity_id
    )
  ) then
    raise exception
      'energy_operation_forbidden'
      using errcode = '42501';
  end if;

  select wallet.*
  into v_wallet
  from public.energy_wallets wallet
  where wallet.id =
    v_reserve.wallet_id
    and wallet.identity_id =
      v_reserve.identity_id
  for update;

  if not found then
    raise exception
      'energy_reservation_wallet_missing'
      using errcode = '23514';
  end if;

  v_paid_amount :=
    v_reserve.reserved_paid_delta;

  v_bonus_amount :=
    v_reserve.reserved_bonus_delta;

  if v_paid_amount < 0
    or v_bonus_amount < 0
    or (
      v_paid_amount +
      v_bonus_amount
    ) <= 0
    or v_reserve.available_paid_delta <>
      -v_paid_amount
    or v_reserve.available_bonus_delta <>
      -v_bonus_amount
  then
    raise exception
      'energy_reservation_corrupt'
      using errcode = '23514';
  end if;

  select entry.*
  into v_final
  from public.energy_ledger_entries entry
  where entry.operation_key =
    v_operation_key
    and entry.event_type in (
      'commit',
      'release'
    )
  limit 1;

  if found then
    if v_final.event_type =
      'release'
    then
      raise exception
        'energy_operation_already_released'
        using errcode = '55000';
    end if;

    if v_final.wallet_id <>
      v_wallet.id
      or v_final.identity_id <>
        v_wallet.identity_id
      or v_final.available_paid_delta <> 0
      or v_final.available_bonus_delta <> 0
      or v_final.reserved_paid_delta <>
        -v_paid_amount
      or v_final.reserved_bonus_delta <>
        -v_bonus_amount
    then
      raise exception
        'energy_final_event_corrupt'
        using errcode = '23514';
    end if;

    return query
    select
      v_operation_key,
      'committed'::text,
      v_reserve.feature,
      (
        v_paid_amount +
        v_bonus_amount
      ),
      v_paid_amount,
      v_bonus_amount,
      v_wallet.id,
      v_wallet.identity_id,
      v_wallet.available_paid,
      v_wallet.available_bonus,
      (
        v_wallet.available_paid +
        v_wallet.available_bonus
      ),
      v_wallet.reserved_paid,
      v_wallet.reserved_bonus,
      (
        v_wallet.reserved_paid +
        v_wallet.reserved_bonus
      ),
      v_final.id,
      v_final.created_at,
      true;

    return;
  end if;

  if v_wallet.reserved_paid <
    v_paid_amount
    or v_wallet.reserved_bonus <
      v_bonus_amount
  then
    raise exception
      'energy_reserved_balance_mismatch'
      using errcode = '23514';
  end if;

  update public.energy_wallets wallet
  set
    reserved_paid =
      wallet.reserved_paid -
        v_paid_amount,
    reserved_bonus =
      wallet.reserved_bonus -
        v_bonus_amount
  where wallet.id =
    v_wallet.id
  returning wallet.*
  into v_wallet;

  insert into public.energy_ledger_entries (
    wallet_id,
    identity_id,
    operation_key,
    event_type,
    feature,
    reserved_paid_delta,
    reserved_bonus_delta,
    public_metadata,
    internal_metadata,
    created_by_user_id
  )
  values (
    v_wallet.id,
    v_wallet.identity_id,
    v_operation_key,
    'commit',
    v_reserve.feature,
    -v_paid_amount,
    -v_bonus_amount,
    v_public_metadata,
    (
      v_internal_metadata ||
      jsonb_build_object(
        'reserve_entry_id',
        v_reserve.id
      )
    ),
    p_user_id
  )
  returning *
  into v_event;

  return query
  select
    v_operation_key,
    'committed'::text,
    v_reserve.feature,
    (
      v_paid_amount +
      v_bonus_amount
    ),
    v_paid_amount,
    v_bonus_amount,
    v_wallet.id,
    v_wallet.identity_id,
    v_wallet.available_paid,
    v_wallet.available_bonus,
    (
      v_wallet.available_paid +
      v_wallet.available_bonus
    ),
    v_wallet.reserved_paid,
    v_wallet.reserved_bonus,
    (
      v_wallet.reserved_paid +
      v_wallet.reserved_bonus
    ),
    v_event.id,
    v_event.created_at,
    false;
end;
$function$;

comment on function
  public.commit_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
is
  'Service-role-only idempotent commit. It follows the globally unique reservation operation key even if the user switched active identity, removes the exact reserved bucket split and appends one commit event atomically.';

revoke all
on function
  public.commit_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
from public, anon, authenticated;

grant execute
on function
  public.commit_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
to service_role;


create or replace function
  public.release_user_energy_v2(
    p_user_id uuid,
    p_operation_key text,
    p_public_metadata jsonb
      default '{}'::jsonb,
    p_internal_metadata jsonb
      default '{}'::jsonb
  )
returns table (
  operation_key text,
  operation_status text,
  feature text,
  amount bigint,
  paid_amount bigint,
  bonus_amount bigint,
  wallet_id uuid,
  identity_id uuid,
  available_paid bigint,
  available_bonus bigint,
  available_total bigint,
  reserved_paid bigint,
  reserved_bonus bigint,
  reserved_total bigint,
  ledger_entry_id uuid,
  event_created_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_operation_key text :=
    btrim(
      coalesce(
        p_operation_key,
        ''
      )
    );

  v_public_metadata jsonb :=
    coalesce(
      p_public_metadata,
      '{}'::jsonb
    );

  v_internal_metadata jsonb :=
    coalesce(
      p_internal_metadata,
      '{}'::jsonb
    );

  v_wallet public.energy_wallets%rowtype;
  v_reserve public.energy_ledger_entries%rowtype;
  v_final public.energy_ledger_entries%rowtype;
  v_event public.energy_ledger_entries%rowtype;
  v_paid_amount bigint;
  v_bonus_amount bigint;
begin
  if p_user_id is null then
    raise exception
      'energy_user_required'
      using errcode = '22023';
  end if;

  if char_length(v_operation_key)
    not between 1 and 200
  then
    raise exception
      'energy_operation_key_invalid'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
    v_public_metadata
  ) <> 'object'
    or jsonb_typeof(
      v_internal_metadata
    ) <> 'object'
  then
    raise exception
      'energy_metadata_invalid'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    73192,
    hashtext(v_operation_key)
  );

  select entry.*
  into v_reserve
  from public.energy_ledger_entries entry
  where entry.operation_key =
    v_operation_key
    and entry.event_type =
      'reserve'
  limit 1;

  if not found then
    raise exception
      'energy_reservation_missing'
      using errcode = 'P0002';
  end if;

  if (
    v_reserve.created_by_user_id
      is distinct from p_user_id
    and not public.user_has_identity_access_v2(
      p_user_id,
      v_reserve.identity_id
    )
  ) then
    raise exception
      'energy_operation_forbidden'
      using errcode = '42501';
  end if;

  select wallet.*
  into v_wallet
  from public.energy_wallets wallet
  where wallet.id =
    v_reserve.wallet_id
    and wallet.identity_id =
      v_reserve.identity_id
  for update;

  if not found then
    raise exception
      'energy_reservation_wallet_missing'
      using errcode = '23514';
  end if;

  v_paid_amount :=
    v_reserve.reserved_paid_delta;

  v_bonus_amount :=
    v_reserve.reserved_bonus_delta;

  if v_paid_amount < 0
    or v_bonus_amount < 0
    or (
      v_paid_amount +
      v_bonus_amount
    ) <= 0
    or v_reserve.available_paid_delta <>
      -v_paid_amount
    or v_reserve.available_bonus_delta <>
      -v_bonus_amount
  then
    raise exception
      'energy_reservation_corrupt'
      using errcode = '23514';
  end if;

  select entry.*
  into v_final
  from public.energy_ledger_entries entry
  where entry.operation_key =
    v_operation_key
    and entry.event_type in (
      'commit',
      'release'
    )
  limit 1;

  if found then
    if v_final.event_type =
      'commit'
    then
      raise exception
        'energy_operation_already_committed'
        using errcode = '55000';
    end if;

    if v_final.wallet_id <>
      v_wallet.id
      or v_final.identity_id <>
        v_wallet.identity_id
      or v_final.available_paid_delta <>
        v_paid_amount
      or v_final.available_bonus_delta <>
        v_bonus_amount
      or v_final.reserved_paid_delta <>
        -v_paid_amount
      or v_final.reserved_bonus_delta <>
        -v_bonus_amount
    then
      raise exception
        'energy_final_event_corrupt'
        using errcode = '23514';
    end if;

    return query
    select
      v_operation_key,
      'released'::text,
      v_reserve.feature,
      (
        v_paid_amount +
        v_bonus_amount
      ),
      v_paid_amount,
      v_bonus_amount,
      v_wallet.id,
      v_wallet.identity_id,
      v_wallet.available_paid,
      v_wallet.available_bonus,
      (
        v_wallet.available_paid +
        v_wallet.available_bonus
      ),
      v_wallet.reserved_paid,
      v_wallet.reserved_bonus,
      (
        v_wallet.reserved_paid +
        v_wallet.reserved_bonus
      ),
      v_final.id,
      v_final.created_at,
      true;

    return;
  end if;

  if v_wallet.reserved_paid <
    v_paid_amount
    or v_wallet.reserved_bonus <
      v_bonus_amount
  then
    raise exception
      'energy_reserved_balance_mismatch'
      using errcode = '23514';
  end if;

  update public.energy_wallets wallet
  set
    available_paid =
      wallet.available_paid +
        v_paid_amount,
    available_bonus =
      wallet.available_bonus +
        v_bonus_amount,
    reserved_paid =
      wallet.reserved_paid -
        v_paid_amount,
    reserved_bonus =
      wallet.reserved_bonus -
        v_bonus_amount
  where wallet.id =
    v_wallet.id
  returning wallet.*
  into v_wallet;

  insert into public.energy_ledger_entries (
    wallet_id,
    identity_id,
    operation_key,
    event_type,
    feature,
    available_paid_delta,
    available_bonus_delta,
    reserved_paid_delta,
    reserved_bonus_delta,
    public_metadata,
    internal_metadata,
    created_by_user_id
  )
  values (
    v_wallet.id,
    v_wallet.identity_id,
    v_operation_key,
    'release',
    v_reserve.feature,
    v_paid_amount,
    v_bonus_amount,
    -v_paid_amount,
    -v_bonus_amount,
    v_public_metadata,
    (
      v_internal_metadata ||
      jsonb_build_object(
        'reserve_entry_id',
        v_reserve.id
      )
    ),
    p_user_id
  )
  returning *
  into v_event;

  return query
  select
    v_operation_key,
    'released'::text,
    v_reserve.feature,
    (
      v_paid_amount +
      v_bonus_amount
    ),
    v_paid_amount,
    v_bonus_amount,
    v_wallet.id,
    v_wallet.identity_id,
    v_wallet.available_paid,
    v_wallet.available_bonus,
    (
      v_wallet.available_paid +
      v_wallet.available_bonus
    ),
    v_wallet.reserved_paid,
    v_wallet.reserved_bonus,
    (
      v_wallet.reserved_paid +
      v_wallet.reserved_bonus
    ),
    v_event.id,
    v_event.created_at,
    false;
end;
$function$;

comment on function
  public.release_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
is
  'Service-role-only idempotent release. It follows the original reservation even after an active-identity switch, returns the exact paid and bonus split, and appends one release event atomically.';

revoke all
on function
  public.release_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
from public, anon, authenticated;

grant execute
on function
  public.release_user_energy_v2(
    uuid,
    text,
    jsonb,
    jsonb
  )
to service_role;

commit;
