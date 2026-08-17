begin;

create unique index
  energy_ledger_admin_test_user_once_idx
on public.energy_ledger_entries (
  operation_key
)
where feature =
  'admin_test_energy'
  and event_type =
    'bonus_grant';


create or replace function
  public.grant_active_admin_test_energy_v2()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_grant_amount constant bigint :=
    5000;

  v_granted_count integer :=
    0;

  v_admin record;
  v_wallet public.energy_wallets%rowtype;
  v_operation_key text;
begin
  for v_admin in
    select
      admin_user.user_id,
      profile.active_identity_id
    from public.admin_users admin_user
    join public.profiles profile
      on profile.id =
        admin_user.user_id
    where admin_user.is_active =
      true
      and profile.active_identity_id
        is not null
    order by
      admin_user.user_id
  loop
    if not exists (
      select 1
      from public.identities identity
      where identity.id =
        v_admin.active_identity_id
        and identity.status =
          'active'
        and (
          (
            identity.type =
              'private'
            and identity.user_id =
              v_admin.user_id
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
                  v_admin.user_id
                and member.status =
                  'active'
            )
          )
        )
    ) then
      continue;
    end if;

    v_operation_key :=
      'admin-test-energy:v1:' ||
      v_admin.user_id::text;

    if exists (
      select 1
      from public.energy_ledger_entries entry
      where entry.operation_key =
        v_operation_key
        and entry.feature =
          'admin_test_energy'
        and entry.event_type =
          'bonus_grant'
    ) then
      continue;
    end if;

    insert into public.energy_wallets (
      identity_id,
      created_by_user_id
    )
    values (
      v_admin.active_identity_id,
      v_admin.user_id
    )
    on conflict (
      identity_id
    )
    do nothing;

    select wallet.*
    into v_wallet
    from public.energy_wallets wallet
    where wallet.identity_id =
      v_admin.active_identity_id
    for update;

    if not found then
      raise exception
        'Admin test Energy wallet could not be created.'
        using errcode = 'P0001';
    end if;

    if exists (
      select 1
      from public.energy_ledger_entries entry
      where entry.operation_key =
        v_operation_key
        and entry.feature =
          'admin_test_energy'
        and entry.event_type =
          'bonus_grant'
    ) then
      continue;
    end if;

    update public.energy_wallets wallet
    set
      available_bonus =
        wallet.available_bonus +
        v_grant_amount,
      updated_at =
        now()
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
      available_bonus_delta,
      public_metadata,
      internal_metadata,
      created_by_user_id
    )
    values (
      v_wallet.id,
      v_wallet.identity_id,
      v_operation_key,
      'bonus_grant',
      'admin_test_energy',
      v_grant_amount,
      jsonb_build_object(
        'label',
        'Admini test-Energy',
        'amount',
        v_grant_amount,
        'purpose',
        'Selqiro arenduse ja testimise jaoks'
      ),
      jsonb_build_object(
        'source',
        'admin_test_seed',
        'grant_version',
        1,
        'admin_user_id',
        v_admin.user_id
      ),
      v_admin.user_id
    );

    v_granted_count :=
      v_granted_count + 1;
  end loop;

  return v_granted_count;
end;
$function$;

comment on function
  public.grant_active_admin_test_energy_v2()
is
  'Service-role-only idempotent seed. Grants 5000 non-purchased bonus Energy once per active admin user to the wallet of the identity that is active when the grant is first applied.';


revoke all
on function
  public.grant_active_admin_test_energy_v2()
from public, anon, authenticated;

grant execute
on function
  public.grant_active_admin_test_energy_v2()
to service_role;


/*
 * Apply the idempotent seed immediately for active
 * administrators already present in this environment.
 */
select
  public.grant_active_admin_test_energy_v2();

commit;
