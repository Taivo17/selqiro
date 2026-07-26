create table if not exists public.product_showcase_images (
  id uuid
    primary key
    default gen_random_uuid(),

  showcase_id uuid
    not null
    references public.product_showcases(id)
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

  created_at timestamp with time zone
    not null
    default now(),

  constraint product_showcase_images_original_url_check
    check (
      char_length(btrim(original_url))
      between 1 and 2000
    ),

  constraint product_showcase_images_medium_url_check
    check (
      medium_url is null
      or char_length(btrim(medium_url))
        between 1 and 2000
    ),

  constraint product_showcase_images_thumb_url_check
    check (
      thumb_url is null
      or char_length(btrim(thumb_url))
        between 1 and 2000
    ),

  constraint product_showcase_images_storage_path_check
    check (
      char_length(btrim(storage_path))
      between 1 and 1000
    ),

  constraint product_showcase_images_sort_order_check
    check (sort_order >= 0),

  constraint product_showcase_images_showcase_path_key
    unique (showcase_id, storage_path)
);

comment on table public.product_showcase_images is
  'Identity-owned product showcase gallery images.';

comment on column public.product_showcase_images.storage_path is
  'Object path inside the product-showcase-images Storage bucket.';

create index if not exists
  product_showcase_images_showcase_order_idx
on public.product_showcase_images (
  showcase_id,
  is_primary desc,
  sort_order,
  created_at
);

create index if not exists
  product_showcase_images_identity_idx
on public.product_showcase_images (
  identity_id,
  created_at desc
);

create unique index if not exists
  product_showcase_images_one_primary_idx
on public.product_showcase_images (
  showcase_id
)
where is_primary = true;

alter table public.product_showcase_images
  enable row level security;

drop policy if exists
  "Public can view published product showcase images"
on public.product_showcase_images;

create policy
  "Public can view published product showcase images"
on public.product_showcase_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_showcases showcase
    where showcase.id =
      product_showcase_images.showcase_id
      and showcase.status = 'published'
  )
);

drop policy if exists
  "Identity members can view product showcase images"
on public.product_showcase_images;

create policy
  "Identity members can view product showcase images"
on public.product_showcase_images
for select
to authenticated
using (
  public.current_user_has_identity_access(
    identity_id
  )
);

revoke all
on table public.product_showcase_images
from anon, authenticated;

grant select
on table public.product_showcase_images
to anon, authenticated;

grant all
on table public.product_showcase_images
to service_role;

create or replace function
  public.can_manage_product_showcase_storage_v2(
    p_showcase_id text
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
      from public.product_showcases showcase
      join public.profiles profile
        on profile.id = auth.uid()
      where showcase.id::text =
        btrim(coalesce(p_showcase_id, ''))
        and profile.active_identity_id =
          showcase.identity_id
        and public.current_user_has_identity_access(
          showcase.identity_id
        )
    );
$function$;

comment on function
  public.can_manage_product_showcase_storage_v2(text)
is
  'Checks whether the authenticated user may manage Storage objects for an active-identity product showcase.';

revoke all
on function
  public.can_manage_product_showcase_storage_v2(text)
from public, anon;

grant execute
on function
  public.can_manage_product_showcase_storage_v2(text)
to authenticated, service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-showcase-images',
  'product-showcase-images',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id)
do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit =
    excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;

drop policy if exists
  "Users can upload active product showcase images"
on storage.objects;

create policy
  "Users can upload active product showcase images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-showcase-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_product_showcase_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);

drop policy if exists
  "Users can list active product showcase images"
on storage.objects;

create policy
  "Users can list active product showcase images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-showcase-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_product_showcase_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);

drop policy if exists
  "Users can delete active product showcase images"
on storage.objects;

create policy
  "Users can delete active product showcase images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-showcase-images'
  and (
    storage.foldername(name)
  )[1] = (
    select auth.uid()::text
  )
  and public.can_manage_product_showcase_storage_v2(
    (
      storage.foldername(name)
    )[2]
  )
);
