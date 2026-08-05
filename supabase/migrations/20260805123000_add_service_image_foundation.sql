create table if not exists
  public.service_images (
    id uuid
      primary key
      default gen_random_uuid(),

    service_id uuid
      not null
      references public.services(id)
      on delete cascade,

    identity_id uuid
      not null
      references public.identities(id)
      on delete cascade,

    uploaded_by_user_id uuid
      not null
      references auth.users(id)
      on delete cascade,

    original_url text
      not null,

    medium_url text,

    thumb_url text,

    storage_path text
      not null,

    sort_order integer
      not null
      default 0,

    is_primary boolean
      not null
      default false,

    created_at timestamptz
      not null
      default now(),

    constraint service_images_original_url_check
      check (
        char_length(
          btrim(original_url)
        ) between 1 and 2000
      ),

    constraint service_images_medium_url_check
      check (
        medium_url is null
        or char_length(
          btrim(medium_url)
        ) between 1 and 2000
      ),

    constraint service_images_thumb_url_check
      check (
        thumb_url is null
        or char_length(
          btrim(thumb_url)
        ) between 1 and 2000
      ),

    constraint service_images_storage_path_check
      check (
        char_length(
          btrim(storage_path)
        ) between 1 and 1000
      ),

    constraint service_images_sort_order_check
      check (
        sort_order >= 0
      ),

    constraint service_images_service_path_key
      unique (
        service_id,
        storage_path
      )
  );

comment on table
  public.service_images
is
  'Identity-owned service gallery images.';

comment on column
  public.service_images.storage_path
is
  'Object path inside the service-images Storage bucket.';

create index if not exists
  service_images_service_order_idx
on public.service_images (
  service_id,
  is_primary desc,
  sort_order,
  created_at,
  id
);

create index if not exists
  service_images_identity_idx
on public.service_images (
  identity_id,
  created_at desc
);

create unique index if not exists
  service_images_one_primary_idx
on public.service_images (
  service_id
)
where is_primary = true;


create or replace function
  public.validate_service_image_identity_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_service_identity_id uuid;
begin
  select service.identity_id
  into v_service_identity_id
  from public.services service
  where service.id =
    new.service_id;

  if not found then
    raise exception
      'The parent service does not exist.'
      using errcode = '23503';
  end if;

  if new.identity_id is distinct from
    v_service_identity_id
  then
    raise exception
      'Service image identity must match the parent service identity.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

alter function
  public.validate_service_image_identity_v2()
owner to postgres;

comment on function
  public.validate_service_image_identity_v2()
is
  'Prevents service image rows from crossing identity boundaries.';

revoke all
on function
  public.validate_service_image_identity_v2()
from public, anon, authenticated;

grant execute
on function
  public.validate_service_image_identity_v2()
to service_role;

drop trigger if exists
  trg_service_images_validate_identity_v2
on public.service_images;

create trigger
  trg_service_images_validate_identity_v2
before insert
or update of
  service_id,
  identity_id
on public.service_images
for each row
execute function
  public.validate_service_image_identity_v2();


alter table
  public.service_images
enable row level security;

drop policy if exists
  "Public can view published service images"
on public.service_images;

create policy
  "Public can view published service images"
on public.service_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.services service
    where service.id =
      service_images.service_id
      and service.status =
        'published'
  )
);

drop policy if exists
  "Identity members can view service images"
on public.service_images;

create policy
  "Identity members can view service images"
on public.service_images
for select
to authenticated
using (
  public.current_user_has_identity_access(
    identity_id
  )
);

revoke all
on table
  public.service_images
from anon, authenticated;

grant select
on table
  public.service_images
to anon, authenticated;

grant all
on table
  public.service_images
to service_role;


create or replace function
  public.can_manage_service_storage_v2(
    p_service_id text
  )
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.services service
      join public.profiles profile
        on profile.id =
          auth.uid()
      where service.id::text =
        btrim(
          coalesce(
            p_service_id,
            ''
          )
        )
        and service.status =
          'draft'
        and profile.active_identity_id =
          service.identity_id
        and public.current_user_has_identity_access(
          service.identity_id
        )
    );
$function$;

alter function
  public.can_manage_service_storage_v2(text)
owner to postgres;

comment on function
  public.can_manage_service_storage_v2(text)
is
  'Checks whether the authenticated user may manage Storage objects for an active-identity draft service.';

revoke all
on function
  public.can_manage_service_storage_v2(text)
from public, anon;

grant execute
on function
  public.can_manage_service_storage_v2(text)
to authenticated, service_role;


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'service-images',
  'service-images',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit =
    excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;


drop policy if exists
  "Users can upload draft service images"
on storage.objects;

create policy
  "Users can upload draft service images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'service-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_service_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);

drop policy if exists
  "Users can list draft service images"
on storage.objects;

create policy
  "Users can list draft service images"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'service-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_service_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);

drop policy if exists
  "Users can delete draft service images"
on storage.objects;

create policy
  "Users can delete draft service images"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'service-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_service_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);
