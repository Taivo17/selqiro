begin;

create or replace function
  public.prepare_my_archived_product_showcase_delete_v2(
    p_showcase_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_showcase public.product_showcases%rowtype;

  v_image_paths text[] :=
    array[]::text[];

  v_storage_paths text[] :=
    array[]::text[];

  v_image_count integer := 0;
  v_delete_guard text;
begin
  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_showcase.status <> 'archived' then
    raise exception
      'Only an archived product showcase can be permanently deleted.'
      using errcode = '22023';
  end if;

  select
    coalesce(
      array_agg(
        image.storage_path
        order by image.storage_path
      ),
      array[]::text[]
    ),
    count(*)::integer
  into
    v_image_paths,
    v_image_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  /*
   * Include both registered gallery paths and any
   * remaining Storage objects under this showcase ID.
   *
   * This also exposes an earlier orphaned upload so the
   * server-side cleanup can remove it before deletion.
   */
  select
    coalesce(
      array_agg(
        candidate.storage_path
        order by candidate.storage_path
      ),
      array[]::text[]
    )
  into v_storage_paths
  from (
    select image.storage_path
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id

    union

    select object.name
    from storage.objects object
    where object.bucket_id =
        'product-showcase-images'
      and (
        storage.foldername(
          object.name
        )
      )[2] =
        p_showcase_id::text
  ) candidate
  where nullif(
    btrim(candidate.storage_path),
    ''
  ) is not null;

  /*
   * The guard is a concurrency fingerprint, not an
   * authorization token. Authorization is always
   * resolved again from the active identity.
   */
  v_delete_guard :=
    md5(
      concat_ws(
        E'\n',
        v_showcase.id::text,
        v_showcase.identity_id::text,
        v_showcase.status,
        extract(
          epoch from v_showcase.updated_at
        )::text,
        array_to_string(
          v_image_paths,
          E'\n'
        )
      )
    );

  return jsonb_build_object(
    'showcase_id',
      v_showcase.id,
    'title',
      v_showcase.title,
    'status',
      v_showcase.status,
    'updated_at',
      v_showcase.updated_at,
    'image_row_count',
      v_image_count,
    'storage_object_count',
      cardinality(v_storage_paths),
    'storage_paths',
      to_jsonb(v_storage_paths),
    'delete_guard',
      v_delete_guard
  );
end;
$function$;

alter function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
owner to postgres;

comment on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
is
  'Returns an active-identity archived showcase deletion manifest, complete Storage paths and a concurrency guard without deleting data.';

revoke all
on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
from public, anon, authenticated;

grant execute
on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
to authenticated, service_role;


create or replace function
  public.delete_my_archived_product_showcase_v2(
    p_showcase_id uuid,
    p_delete_guard text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_requested_guard text :=
    lower(
      btrim(
        coalesce(
          p_delete_guard,
          ''
        )
      )
    );

  v_showcase public.product_showcases%rowtype;

  v_image_paths text[] :=
    array[]::text[];

  v_image_count integer := 0;
  v_deleted_image_count integer := 0;

  v_current_guard text;

  v_deleted_showcase_id uuid;
  v_deleted_title text;
begin
  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  if
    char_length(v_requested_guard) <> 32
    or v_requested_guard !~ '^[0-9a-f]{32}$'
  then
    raise exception
      'Product showcase deletion guard is invalid.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_showcase.status <> 'archived' then
    raise exception
      'Only an archived product showcase can be permanently deleted.'
      using errcode = '22023';
  end if;

  /*
   * Lock current gallery rows. The parent row lock also
   * prevents a concurrent FK insert from completing
   * while final deletion is in progress.
   */
  perform 1
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id
  for update;

  select
    coalesce(
      array_agg(
        image.storage_path
        order by image.storage_path
      ),
      array[]::text[]
    ),
    count(*)::integer
  into
    v_image_paths,
    v_image_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  v_current_guard :=
    md5(
      concat_ws(
        E'\n',
        v_showcase.id::text,
        v_showcase.identity_id::text,
        v_showcase.status,
        extract(
          epoch from v_showcase.updated_at
        )::text,
        array_to_string(
          v_image_paths,
          E'\n'
        )
      )
    );

  if v_current_guard <> v_requested_guard then
    raise exception
      'The product showcase changed after the deletion manifest was prepared.'
      using errcode = '40001';
  end if;

  /*
   * Never delete the database rows while a public
   * Storage object remains under the showcase folder.
   *
   * The server-side workflow must first remove every
   * path returned by the preparation RPC.
   */
  if exists (
    select 1
    from storage.objects object
    where object.bucket_id =
        'product-showcase-images'
      and (
        storage.foldername(
          object.name
        )
      )[2] =
        p_showcase_id::text
  ) then
    raise exception
      'Product showcase Storage cleanup is incomplete.'
      using errcode = '55000';
  end if;

  delete from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  get diagnostics
    v_deleted_image_count =
      row_count;

  delete from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
    and showcase.status =
      'archived'
  returning
    showcase.id,
    showcase.title
  into
    v_deleted_showcase_id,
    v_deleted_title;

  if not found then
    raise exception
      'The archived product showcase could not be deleted because it changed.'
      using errcode = '40001';
  end if;

  return jsonb_build_object(
    'deleted_showcase_id',
      v_deleted_showcase_id,
    'title',
      v_deleted_title,
    'deleted_image_rows',
      v_deleted_image_count,
    'expected_image_rows',
      v_image_count,
    'deleted_at',
      now()
  );
end;
$function$;

alter function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    text
  )
owner to postgres;

comment on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    text
  )
is
  'Permanently deletes an unchanged active-identity archived showcase only after all corresponding Storage objects have been removed.';

revoke all
on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    text
  )
from public, anon, authenticated;

grant execute
on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    text
  )
to authenticated, service_role;

create or replace function
  public.can_upload_product_showcase_storage_v2(
    p_showcase_id text
  )
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    public.can_manage_product_showcase_storage_v2(
      p_showcase_id
    )
    and exists (
      select 1
      from public.product_showcases showcase
      where showcase.id::text =
          btrim(
            coalesce(
              p_showcase_id,
              ''
            )
          )
        and showcase.status <>
          'archived'
    );
$function$;

alter function
  public.can_upload_product_showcase_storage_v2(
    text
  )
owner to postgres;

comment on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
is
  'Allows active-identity Storage uploads only while the product showcase is not archived.';

revoke all
on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
from public, anon, authenticated;

grant execute
on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
to authenticated, service_role;


drop policy if exists
  "Users can upload active product showcase images"
on storage.objects;

create policy
  "Users can upload active product showcase images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'product-showcase-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_upload_product_showcase_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);


create or replace function
  public.reject_archived_product_showcase_image_insert_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_showcase_status text;
begin
  select showcase.status
  into v_showcase_status
  from public.product_showcases showcase
  where showcase.id =
    new.showcase_id;

  if v_showcase_status = 'archived' then
    raise exception
      'Images cannot be added to an archived product showcase.'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

alter function
  public.reject_archived_product_showcase_image_insert_v2()
owner to postgres;

comment on function
  public.reject_archived_product_showcase_image_insert_v2()
is
  'Prevents a new gallery row from being attached to an archived product showcase.';

revoke all
on function
  public.reject_archived_product_showcase_image_insert_v2()
from public, anon, authenticated;


drop trigger if exists
  trg_product_showcase_images_reject_archived_parent_v2
on public.product_showcase_images;

create trigger
  trg_product_showcase_images_reject_archived_parent_v2
before insert or update of showcase_id
on public.product_showcase_images
for each row
execute function
  public.reject_archived_product_showcase_image_insert_v2();

alter table public.product_showcases
  add column if not exists
    deletion_token uuid,
  add column if not exists
    deletion_requested_at timestamptz;

comment on column
  public.product_showcases.deletion_token
is
  'Internal token that freezes an archived product showcase while permanent deletion is being completed.';

comment on column
  public.product_showcases.deletion_requested_at
is
  'Time when the current permanent-deletion workflow was started.';


alter table public.product_showcases
  drop constraint if exists
    product_showcases_deletion_state_check;

alter table public.product_showcases
  add constraint
    product_showcases_deletion_state_check
  check (
    (
      deletion_token is null
      and deletion_requested_at is null
    )
    or (
      deletion_token is not null
      and deletion_requested_at is not null
      and status = 'archived'
    )
  );

create unique index if not exists
  product_showcases_deletion_token_idx
on public.product_showcases (
  deletion_token
)
where deletion_token is not null;


create or replace function
  public.guard_product_showcase_deletion_update_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if old.deletion_token is null then
    return new;
  end if;

  /*
   * A cancellation RPC may clear only the two
   * deletion-workflow fields. Every content or status
   * change remains blocked while deletion is pending.
   */
  if
    new.deletion_token is null
    and new.deletion_requested_at is null
    and row(
      new.id,
      new.identity_id,
      new.title,
      new.description,
      new.category,
      new.image_url,
      new.external_url,
      new.status,
      new.sort_order,
      new.published_at,
      new.created_at,
      new.updated_at,
      new.last_confirmed_at,
      new.active_until
    )
    is not distinct from
    row(
      old.id,
      old.identity_id,
      old.title,
      old.description,
      old.category,
      old.image_url,
      old.external_url,
      old.status,
      old.sort_order,
      old.published_at,
      old.created_at,
      old.updated_at,
      old.last_confirmed_at,
      old.active_until
    )
  then
    return new;
  end if;

  raise exception
    'Product showcase deletion is already in progress.'
    using errcode = '55000';
end;
$function$;

alter function
  public.guard_product_showcase_deletion_update_v2()
owner to postgres;

comment on function
  public.guard_product_showcase_deletion_update_v2()
is
  'Freezes product-showcase content and status while a permanent deletion token is active.';

revoke all
on function
  public.guard_product_showcase_deletion_update_v2()
from public, anon, authenticated;


drop trigger if exists
  trg_product_showcases_guard_deletion_update_v2
on public.product_showcases;

create trigger
  trg_product_showcases_guard_deletion_update_v2
before update
on public.product_showcases
for each row
execute function
  public.guard_product_showcase_deletion_update_v2();


create or replace function
  public.guard_product_showcase_image_deletion_state_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_showcase_id uuid;
begin
  if tg_op = 'DELETE' then
    v_showcase_id :=
      old.showcase_id;
  else
    v_showcase_id :=
      new.showcase_id;
  end if;

  if exists (
    select 1
    from public.product_showcases showcase
    where showcase.id =
        v_showcase_id
      and showcase.deletion_token
        is not null
  ) then
    raise exception
      'Product showcase deletion is already in progress.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

alter function
  public.guard_product_showcase_image_deletion_state_v2()
owner to postgres;

comment on function
  public.guard_product_showcase_image_deletion_state_v2()
is
  'Prevents gallery inserts, updates and deletes while permanent showcase deletion is pending.';

revoke all
on function
  public.guard_product_showcase_image_deletion_state_v2()
from public, anon, authenticated;


drop trigger if exists
  trg_product_showcase_images_guard_deletion_state_v2
on public.product_showcase_images;

create trigger
  trg_product_showcase_images_guard_deletion_state_v2
before insert or update or delete
on public.product_showcase_images
for each row
execute function
  public.guard_product_showcase_image_deletion_state_v2();


create or replace function
  public.can_upload_product_showcase_storage_v2(
    p_showcase_id text
  )
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    public.can_manage_product_showcase_storage_v2(
      p_showcase_id
    )
    and exists (
      select 1
      from public.product_showcases showcase
      where showcase.id::text =
          btrim(
            coalesce(
              p_showcase_id,
              ''
            )
          )
        and showcase.status <>
          'archived'
        and showcase.deletion_token
          is null
    );
$function$;

alter function
  public.can_upload_product_showcase_storage_v2(
    text
  )
owner to postgres;

comment on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
is
  'Allows active-identity Storage uploads only while the product showcase is editable and no permanent deletion is pending.';

revoke all
on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
from public, anon, authenticated;

grant execute
on function
  public.can_upload_product_showcase_storage_v2(
    text
  )
to authenticated, service_role;


create or replace function
  public.reject_archived_product_showcase_image_insert_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_showcase_status text;
  v_deletion_token uuid;
begin
  select
    showcase.status,
    showcase.deletion_token
  into
    v_showcase_status,
    v_deletion_token
  from public.product_showcases showcase
  where showcase.id =
    new.showcase_id;

  if
    v_showcase_status = 'archived'
    or v_deletion_token is not null
  then
    raise exception
      'Images cannot be added to an archived or deleting product showcase.'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

alter function
  public.reject_archived_product_showcase_image_insert_v2()
owner to postgres;

comment on function
  public.reject_archived_product_showcase_image_insert_v2()
is
  'Prevents new gallery rows from being attached to archived or deleting product showcases.';

revoke all
on function
  public.reject_archived_product_showcase_image_insert_v2()
from public, anon, authenticated;


/*
 * Replace the first version of the preparation RPC
 * with an idempotent deletion-token workflow.
 */
create or replace function
  public.prepare_my_archived_product_showcase_delete_v2(
    p_showcase_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_now timestamptz :=
    now();

  v_showcase public.product_showcases%rowtype;

  v_storage_paths text[] :=
    array[]::text[];

  v_image_count integer := 0;
begin
  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_showcase.status <> 'archived' then
    raise exception
      'Only an archived product showcase can be permanently deleted.'
      using errcode = '22023';
  end if;

  /*
   * Repeated preparation is safe. A failed server-side
   * Storage cleanup can reuse the existing token and
   * receive the list of objects that still remain.
   */
  if v_showcase.deletion_token is null then
    update public.product_showcases showcase
    set
      deletion_token =
        gen_random_uuid(),
      deletion_requested_at =
        v_now
    where showcase.id =
        p_showcase_id
      and showcase.identity_id =
        v_active_identity_id
      and showcase.status =
        'archived'
      and showcase.deletion_token
        is null
    returning *
    into v_showcase;

    if not found then
      raise exception
        'The archived product showcase could not be locked for deletion.'
        using errcode = '40001';
    end if;
  end if;

  select count(*)::integer
  into v_image_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  /*
   * Return registered image paths plus any orphaned
   * Storage object found under the showcase folder.
   */
  select
    coalesce(
      array_agg(
        candidate.storage_path
        order by candidate.storage_path
      ),
      array[]::text[]
    )
  into v_storage_paths
  from (
    select image.storage_path
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id

    union

    select object.name
    from storage.objects object
    where object.bucket_id =
        'product-showcase-images'
      and (
        storage.foldername(
          object.name
        )
      )[2] =
        p_showcase_id::text
  ) candidate
  where nullif(
    btrim(candidate.storage_path),
    ''
  ) is not null;

  return jsonb_build_object(
    'showcase_id',
      v_showcase.id,
    'title',
      v_showcase.title,
    'status',
      v_showcase.status,
    'deletion_token',
      v_showcase.deletion_token,
    'deletion_requested_at',
      v_showcase.deletion_requested_at,
    'image_row_count',
      v_image_count,
    'storage_object_count',
      cardinality(v_storage_paths),
    'storage_paths',
      to_jsonb(v_storage_paths)
  );
end;
$function$;

alter function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
owner to postgres;

comment on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
is
  'Locks an active-identity archived showcase for permanent deletion and returns an idempotent Storage cleanup manifest.';

revoke all
on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
from public, anon, authenticated;

grant execute
on function
  public.prepare_my_archived_product_showcase_delete_v2(
    uuid
  )
to authenticated, service_role;


/*
 * Remove the earlier text-guard signature. The hardened
 * workflow uses a database-issued UUID deletion token.
 */
drop function if exists
  public.delete_my_archived_product_showcase_v2(
    uuid,
    text
  );

create or replace function
  public.delete_my_archived_product_showcase_v2(
    p_showcase_id uuid,
    p_deletion_token uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_showcase public.product_showcases%rowtype;

  v_image_count integer := 0;
  v_deleted_image_count integer := 0;

  v_deleted_showcase_id uuid;
  v_deleted_title text;
begin
  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  if p_deletion_token is null then
    raise exception
      'Product showcase deletion token is required.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_showcase.status <> 'archived' then
    raise exception
      'Only an archived product showcase can be permanently deleted.'
      using errcode = '22023';
  end if;

  if
    v_showcase.deletion_token is null
    or v_showcase.deletion_token <>
      p_deletion_token
  then
    raise exception
      'The product showcase deletion token is invalid or stale.'
      using errcode = '40001';
  end if;

  if exists (
    select 1
    from storage.objects object
    where object.bucket_id =
        'product-showcase-images'
      and (
        storage.foldername(
          object.name
        )
      )[2] =
        p_showcase_id::text
  ) then
    raise exception
      'Product showcase Storage cleanup is incomplete.'
      using errcode = '55000';
  end if;

  select count(*)::integer
  into v_image_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  /*
   * Clear the lock while retaining the row lock. Other
   * transactions still cannot modify this row before
   * the current transaction commits, and then the row
   * no longer exists.
   */
  update public.product_showcases showcase
  set
    deletion_token = null,
    deletion_requested_at = null
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
    and showcase.deletion_token =
      p_deletion_token;

  if not found then
    raise exception
      'The product showcase deletion lock changed.'
      using errcode = '40001';
  end if;

  delete from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  get diagnostics
    v_deleted_image_count =
      row_count;

  delete from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
    and showcase.status =
      'archived'
  returning
    showcase.id,
    showcase.title
  into
    v_deleted_showcase_id,
    v_deleted_title;

  if not found then
    raise exception
      'The archived product showcase could not be deleted.'
      using errcode = '40001';
  end if;

  if exists (
    select 1
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id
  ) then
    raise exception
      'Product showcase image-row cleanup is incomplete.'
      using errcode = '55000';
  end if;

  return jsonb_build_object(
    'deleted_showcase_id',
      v_deleted_showcase_id,
    'title',
      v_deleted_title,
    'deleted_image_rows',
      v_deleted_image_count,
    'expected_image_rows',
      v_image_count,
    'deleted_at',
      now()
  );
end;
$function$;

alter function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    uuid
  )
is
  'Permanently deletes a locked active-identity archived showcase after every corresponding Storage object has been removed.';

revoke all
on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute
on function
  public.delete_my_archived_product_showcase_v2(
    uuid,
    uuid
  )
to authenticated, service_role;


create or replace function
  public.cancel_my_archived_product_showcase_delete_v2(
    p_showcase_id uuid,
    p_deletion_token uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_showcase public.product_showcases%rowtype;
begin
  if
    p_showcase_id is null
    or p_deletion_token is null
  then
    raise exception
      'Product showcase ID and deletion token are required.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if
    v_showcase.status <> 'archived'
    or v_showcase.deletion_token is null
    or v_showcase.deletion_token <>
      p_deletion_token
  then
    raise exception
      'The product showcase deletion token is invalid or stale.'
      using errcode = '40001';
  end if;

  /*
   * Do not unlock a showcase once registered image
   * files have already been removed. At that point the
   * only safe action is to retry permanent deletion.
   */
  if exists (
    select 1
    from public.product_showcase_images image
    where image.showcase_id =
        p_showcase_id
      and not exists (
        select 1
        from storage.objects object
        where object.bucket_id =
            'product-showcase-images'
          and object.name =
            image.storage_path
      )
  ) then
    raise exception
      'Storage cleanup has already started; permanent deletion must be retried.'
      using errcode = '55000';
  end if;

  update public.product_showcases showcase
  set
    deletion_token = null,
    deletion_requested_at = null
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
    and showcase.deletion_token =
      p_deletion_token
  returning *
  into v_showcase;

  if not found then
    raise exception
      'The product showcase deletion lock changed.'
      using errcode = '40001';
  end if;

  return jsonb_build_object(
    'showcase_id',
      v_showcase.id,
    'title',
      v_showcase.title,
    'deletion_cancelled',
      true
  );
end;
$function$;

alter function
  public.cancel_my_archived_product_showcase_delete_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.cancel_my_archived_product_showcase_delete_v2(
    uuid,
    uuid
  )
is
  'Cancels a pending archived-showcase deletion only before registered Storage files have been removed.';

revoke all
on function
  public.cancel_my_archived_product_showcase_delete_v2(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute
on function
  public.cancel_my_archived_product_showcase_delete_v2(
    uuid,
    uuid
  )
to authenticated, service_role;

commit;
