begin;

create table public.energy_wallets (
  id uuid primary key
    default gen_random_uuid(),

  identity_id uuid not null
    references public.identities(id)
    on delete restrict,

  available_paid bigint not null
    default 0,

  available_bonus bigint not null
    default 0,

  reserved_paid bigint not null
    default 0,

  reserved_bonus bigint not null
    default 0,

  created_by_user_id uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint energy_wallets_identity_key
    unique (identity_id),

  constraint energy_wallets_available_paid_check
    check (available_paid >= 0),

  constraint energy_wallets_available_bonus_check
    check (available_bonus >= 0),

  constraint energy_wallets_reserved_paid_check
    check (reserved_paid >= 0),

  constraint energy_wallets_reserved_bonus_check
    check (reserved_bonus >= 0)
);

comment on table public.energy_wallets is
  'One Energy wallet per Selqiro identity. Paid, bonus and reserved balances are stored separately and may only be changed by secure server-side Energy operations.';

comment on column public.energy_wallets.identity_id is
  'Wallet owner. A private identity has its own wallet; an active business identity shares one wallet between authorized members.';

comment on column public.energy_wallets.available_paid is
  'Purchased Energy currently available for optional operations.';

comment on column public.energy_wallets.available_bonus is
  'Promotional or welcome Energy currently available for optional operations.';

comment on column public.energy_wallets.reserved_paid is
  'Purchased Energy reserved for an operation that has not yet been committed or released.';

comment on column public.energy_wallets.reserved_bonus is
  'Promotional Energy reserved for an operation that has not yet been committed or released.';


create index energy_wallets_identity_created_idx
on public.energy_wallets (
  identity_id,
  created_at
);


create trigger
  trg_energy_wallets_set_updated_at
before update
on public.energy_wallets
for each row
execute function
  public.set_v2_profile_content_updated_at();


create table public.energy_ledger_entries (
  id uuid primary key
    default gen_random_uuid(),

  wallet_id uuid not null
    references public.energy_wallets(id)
    on delete restrict,

  identity_id uuid not null
    references public.identities(id)
    on delete restrict,

  operation_key text not null,

  event_type text not null,

  feature text not null,

  available_paid_delta bigint not null
    default 0,

  available_bonus_delta bigint not null
    default 0,

  reserved_paid_delta bigint not null
    default 0,

  reserved_bonus_delta bigint not null
    default 0,

  public_metadata jsonb not null
    default '{}'::jsonb,

  internal_metadata jsonb not null
    default '{}'::jsonb,

  created_by_user_id uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  constraint energy_ledger_operation_key_check
    check (
      char_length(
        btrim(operation_key)
      ) between 1 and 200
    ),

  constraint energy_ledger_event_type_check
    check (
      event_type in (
        'paid_grant',
        'bonus_grant',
        'reserve',
        'commit',
        'release',
        'adjustment'
      )
    ),

  constraint energy_ledger_feature_check
    check (
      char_length(
        btrim(feature)
      ) between 1 and 80
    ),

  constraint energy_ledger_nonzero_delta_check
    check (
      available_paid_delta <> 0
      or available_bonus_delta <> 0
      or reserved_paid_delta <> 0
      or reserved_bonus_delta <> 0
    ),

  constraint energy_ledger_public_metadata_check
    check (
      jsonb_typeof(public_metadata) =
        'object'
    ),

  constraint energy_ledger_internal_metadata_check
    check (
      jsonb_typeof(internal_metadata) =
        'object'
    )
);

comment on table public.energy_ledger_entries is
  'Append-only Energy financial event history. Corrections are new events; existing rows are never edited or deleted.';

comment on column public.energy_ledger_entries.operation_key is
  'Stable idempotency key for one chargeable operation, welcome grant, purchase or adjustment.';

comment on column public.energy_ledger_entries.event_type is
  'Financial event type. Reserve moves available Energy into reserved Energy; commit consumes the reservation; release returns it.';

comment on column public.energy_ledger_entries.public_metadata is
  'Metadata that may be returned to the wallet owner in Energy history.';

comment on column public.energy_ledger_entries.internal_metadata is
  'Internal cost, moderation or provider metadata that is never returned by the owner history RPC.';


create index energy_ledger_wallet_created_idx
on public.energy_ledger_entries (
  wallet_id,
  created_at desc,
  id desc
);

create index energy_ledger_identity_created_idx
on public.energy_ledger_entries (
  identity_id,
  created_at desc,
  id desc
);

create unique index
  energy_ledger_event_once_idx
on public.energy_ledger_entries (
  wallet_id,
  operation_key,
  event_type
);

create unique index
  energy_ledger_one_final_event_idx
on public.energy_ledger_entries (
  wallet_id,
  operation_key
)
where event_type in (
  'commit',
  'release'
);


create or replace function
  public.validate_energy_ledger_identity_v2()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
begin
  if not exists (
    select 1
    from public.energy_wallets wallet
    where wallet.id =
      new.wallet_id
      and wallet.identity_id =
        new.identity_id
  ) then
    raise exception
      'Energy ledger wallet and identity do not match.'
      using errcode = '23514';
  end if;

  new.operation_key :=
    btrim(
      new.operation_key
    );

  new.feature :=
    btrim(
      new.feature
    );

  return new;
end;
$function$;

comment on function
  public.validate_energy_ledger_identity_v2()
is
  'Validates that a new append-only Energy ledger event belongs to the same identity as its wallet.';


create trigger
  trg_energy_ledger_validate_identity
before insert
on public.energy_ledger_entries
for each row
execute function
  public.validate_energy_ledger_identity_v2();


create or replace function
  public.prevent_energy_ledger_mutation_v2()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
begin
  raise exception
    'Energy ledger entries are append-only.'
    using errcode = '55000';
end;
$function$;

comment on function
  public.prevent_energy_ledger_mutation_v2()
is
  'Rejects updates and deletes from the append-only Energy ledger. Corrections require a new adjustment event.';


create trigger
  trg_energy_ledger_prevent_mutation
before update or delete
on public.energy_ledger_entries
for each row
execute function
  public.prevent_energy_ledger_mutation_v2();


alter table public.energy_wallets
enable row level security;

alter table public.energy_ledger_entries
enable row level security;


drop policy if exists
  "Identity members can view own Energy wallet"
on public.energy_wallets;

create policy
  "Identity members can view own Energy wallet"
on public.energy_wallets
for select
to authenticated
using (
  public.current_user_has_identity_access(
    identity_id
  )
);


drop policy if exists
  "Identity members can view own Energy ledger"
on public.energy_ledger_entries;

create policy
  "Identity members can view own Energy ledger"
on public.energy_ledger_entries
for select
to authenticated
using (
  public.current_user_has_identity_access(
    identity_id
  )
);


revoke all
on table public.energy_wallets
from public, anon, authenticated;

revoke all
on table public.energy_ledger_entries
from public, anon, authenticated;

grant all
on table public.energy_wallets
to service_role;

grant all
on table public.energy_ledger_entries
to service_role;


create or replace function
  public.ensure_my_energy_wallet_v2()
returns setof public.energy_wallets
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_wallet public.energy_wallets%rowtype;
begin
  insert into public.energy_wallets (
    identity_id,
    created_by_user_id
  )
  values (
    v_identity_id,
    v_user_id
  )
  on conflict (
    identity_id
  )
  do nothing;

  select wallet.*
  into v_wallet
  from public.energy_wallets wallet
  where wallet.identity_id =
    v_identity_id;

  if not found then
    raise exception
      'Energy wallet could not be created.'
      using errcode = 'P0001';
  end if;

  return next v_wallet;
  return;
end;
$function$;

comment on function
  public.ensure_my_energy_wallet_v2()
is
  'Internal idempotent helper that creates or returns the authenticated user active-identity Energy wallet.';


create or replace function
  public.get_my_energy_wallet_v2()
returns table (
  wallet_id uuid,
  identity_id uuid,
  available_paid bigint,
  available_bonus bigint,
  available_total bigint,
  reserved_paid bigint,
  reserved_bonus bigint,
  reserved_total bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_wallet public.energy_wallets%rowtype;
begin
  select wallet.*
  into v_wallet
  from public.ensure_my_energy_wallet_v2()
    wallet
  limit 1;

  return query
  select
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
    v_wallet.created_at,
    v_wallet.updated_at;
end;
$function$;

comment on function
  public.get_my_energy_wallet_v2()
is
  'Returns the authenticated user active-identity Energy wallet summary, creating the empty wallet idempotently when needed.';


create or replace function
  public.get_my_energy_ledger_v2(
    p_limit integer
      default 50,
    p_offset integer
      default 0
  )
returns table (
  entry_id uuid,
  operation_key text,
  event_type text,
  feature text,
  available_paid_delta bigint,
  available_bonus_delta bigint,
  reserved_paid_delta bigint,
  reserved_bonus_delta bigint,
  public_metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_wallet_id uuid;

  v_limit integer :=
    least(
      greatest(
        coalesce(
          p_limit,
          50
        ),
        1
      ),
      100
    );

  v_offset integer :=
    greatest(
      coalesce(
        p_offset,
        0
      ),
      0
    );
begin
  select wallet.id
  into v_wallet_id
  from public.ensure_my_energy_wallet_v2()
    wallet
  limit 1;

  return query
  select
    entry.id,
    entry.operation_key,
    entry.event_type,
    entry.feature,
    entry.available_paid_delta,
    entry.available_bonus_delta,
    entry.reserved_paid_delta,
    entry.reserved_bonus_delta,
    entry.public_metadata,
    entry.created_at
  from public.energy_ledger_entries entry
  where entry.wallet_id =
    v_wallet_id
    and entry.identity_id =
      v_identity_id
  order by
    entry.created_at desc,
    entry.id desc
  limit v_limit
  offset v_offset;
end;
$function$;

comment on function
  public.get_my_energy_ledger_v2(
    integer,
    integer
  )
is
  'Returns a bounded owner-visible Energy history for the authenticated user active identity. Internal metadata is never returned.';


revoke all
on function
  public.ensure_my_energy_wallet_v2()
from public, anon, authenticated;

grant execute
on function
  public.ensure_my_energy_wallet_v2()
to service_role;


revoke all
on function
  public.get_my_energy_wallet_v2()
from public, anon;

grant execute
on function
  public.get_my_energy_wallet_v2()
to authenticated, service_role;


revoke all
on function
  public.get_my_energy_ledger_v2(
    integer,
    integer
  )
from public, anon;

grant execute
on function
  public.get_my_energy_ledger_v2(
    integer,
    integer
  )
to authenticated, service_role;

commit;
