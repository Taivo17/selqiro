create or replace function
  public.add_my_product_showcase_image_v2(
    p_showcase_id uuid,
    p_original_url text,
    p_storage_path text,
    p_medium_url text default null,
    p_thumb_url text default null,
    p_max_images integer default 10
  )
returns setof public.product_showcase_images
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_original_url text :=
    nullif(
      btrim(coalesce(p_original_url, '')),
      ''
    );

  v_medium_url text :=
    nullif(
      btrim(coalesce(p_medium_url, '')),
      ''
    );

  v_thumb_url text :=
    nullif(
      btrim(coalesce(p_thumb_url, '')),
      ''
    );

  v_storage_path text :=
    nullif(
      btrim(coalesce(p_storage_path, '')),
      ''
    );

  v_max_images integer :=
    least(
      greatest(
        coalesce(p_max_images, 10),
        1
      ),
      10
    );

  v_image_count integer;
  v_next_sort_order integer;
  v_is_primary boolean;

  v_showcase public.product_showcases%rowtype;
  v_inserted public.product_showcase_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  if v_original_url is null then
    raise exception
      'Product showcase image URL is required.'
      using errcode = '22023';
  end if;

  if char_length(v_original_url) > 2000 then
    raise exception
      'Product showcase image URL is too long.'
      using errcode = '22023';
  end if;

  if
    lower(v_original_url) !~ '^https?://'
    or position(
      '/storage/v1/object/public/product-showcase-images/'
      in v_original_url
    ) = 0
  then
    raise exception
      'Product showcase image URL must point to the product-showcase-images bucket.'
      using errcode = '22023';
  end if;

  if v_storage_path is null then
    raise exception
      'Product showcase image storage path is required.'
      using errcode = '22023';
  end if;

  if char_length(v_storage_path) > 1000 then
    raise exception
      'Product showcase image storage path is too long.'
      using errcode = '22023';
  end if;

  if
    split_part(v_storage_path, '/', 1)
      <> v_user_id::text
    or split_part(v_storage_path, '/', 2)
      <> p_showcase_id::text
    or split_part(v_storage_path, '/', 3) = ''
  then
    raise exception
      'Product showcase image storage path does not match the authenticated user and showcase.'
      using errcode = '42501';
  end if;

  if
    v_storage_path ~ '(^|/)\.\.?(/|$)'
    or position('//' in v_storage_path) > 0
  then
    raise exception
      'Product showcase image storage path is invalid.'
      using errcode = '22023';
  end if;

  if
    right(
      v_original_url,
      char_length(v_storage_path)
    ) <> v_storage_path
  then
    raise exception
      'Product showcase image URL does not match its Storage path.'
      using errcode = '22023';
  end if;

  if
    v_medium_url is not null
    and (
      char_length(v_medium_url) > 2000
      or lower(v_medium_url) !~ '^https?://'
      or position(
        '/storage/v1/object/public/product-showcase-images/'
        in v_medium_url
      ) = 0
    )
  then
    raise exception
      'Product showcase medium image URL is invalid.'
      using errcode = '22023';
  end if;

  if
    v_thumb_url is not null
    and (
      char_length(v_thumb_url) > 2000
      or lower(v_thumb_url) !~ '^https?://'
      or position(
        '/storage/v1/object/public/product-showcase-images/'
        in v_thumb_url
      ) = 0
    )
  then
    raise exception
      'Product showcase thumbnail URL is invalid.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id = p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id =
      'product-showcase-images'
      and object.name = v_storage_path
  ) then
    raise exception
      'The uploaded product showcase image was not found in Storage.'
      using errcode = '22023';
  end if;

  select
    count(*),
    coalesce(
      max(image.sort_order),
      -1
    ) + 1
  into
    v_image_count,
    v_next_sort_order
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  if v_image_count >= v_max_images then
    raise exception
      'A product showcase can contain at most 10 images.'
      using errcode = '22023';
  end if;

  v_is_primary := v_image_count = 0;

  insert into public.product_showcase_images (
    showcase_id,
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
    p_showcase_id,
    v_active_identity_id,
    v_user_id,
    v_original_url,
    v_medium_url,
    v_thumb_url,
    v_storage_path,
    v_next_sort_order,
    v_is_primary
  )
  returning *
  into v_inserted;

  if v_is_primary then
    update public.product_showcases showcase
    set
      image_url = coalesce(
        v_inserted.medium_url,
        v_inserted.original_url,
        v_inserted.thumb_url
      ),
      updated_at = now()
    where showcase.id =
      p_showcase_id;
  end if;

  return next v_inserted;
  return;
end;
$function$;

alter function
  public.add_my_product_showcase_image_v2(
    uuid,
    text,
    text,
    text,
    text,
    integer
  )
owner to postgres;

comment on function
  public.add_my_product_showcase_image_v2(
    uuid,
    text,
    text,
    text,
    text,
    integer
  )
is
  'Registers a Storage-backed image for an active-identity product showcase.';

revoke all
on function
  public.add_my_product_showcase_image_v2(
    uuid,
    text,
    text,
    text,
    text,
    integer
  )
from public, anon;

grant execute
on function
  public.add_my_product_showcase_image_v2(
    uuid,
    text,
    text,
    text,
    text,
    integer
  )
to authenticated, service_role;


create or replace function
  public.set_my_product_showcase_primary_image_v2(
    p_showcase_id uuid,
    p_image_id uuid
  )
returns setof public.product_showcase_images
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
  v_primary_url text;

  v_showcase public.product_showcases%rowtype;
  v_image public.product_showcase_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if
    p_showcase_id is null
    or p_image_id is null
  then
    raise exception
      'Product showcase and image IDs are required.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id = p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  select image.*
  into v_image
  from public.product_showcase_images image
  where image.id = p_image_id
    and image.showcase_id =
      p_showcase_id
    and image.identity_id =
      v_active_identity_id;

  if not found then
    raise exception
      'The product showcase image was not found.'
      using errcode = '22023';
  end if;

  update public.product_showcase_images image
  set is_primary = false
  where image.showcase_id =
    p_showcase_id;

  with ordered_images as (
    select
      image.id,
      (
        row_number() over (
          order by
            case
              when image.id = p_image_id
                then 0
              else 1
            end,
            image.sort_order,
            image.created_at,
            image.id
        ) - 1
      )::integer as new_sort_order
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id
  )
  update public.product_showcase_images image
  set sort_order =
    ordered_images.new_sort_order
  from ordered_images
  where image.id =
    ordered_images.id;

  update public.product_showcase_images image
  set is_primary = true
  where image.id = p_image_id
    and image.showcase_id =
      p_showcase_id
  returning *
  into v_image;

  v_primary_url := coalesce(
    v_image.medium_url,
    v_image.original_url,
    v_image.thumb_url
  );

  update public.product_showcases showcase
  set
    image_url = v_primary_url,
    updated_at = now()
  where showcase.id =
    p_showcase_id;

  return next v_image;
  return;
end;
$function$;

alter function
  public.set_my_product_showcase_primary_image_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.set_my_product_showcase_primary_image_v2(
    uuid,
    uuid
  )
is
  'Sets the primary image of an active-identity product showcase.';

revoke all
on function
  public.set_my_product_showcase_primary_image_v2(
    uuid,
    uuid
  )
from public, anon;

grant execute
on function
  public.set_my_product_showcase_primary_image_v2(
    uuid,
    uuid
  )
to authenticated, service_role;


create or replace function
  public.delete_my_product_showcase_image_v2(
    p_showcase_id uuid,
    p_image_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_image_count integer;
  v_remaining_count integer;
  v_fallback_image text;

  v_showcase public.product_showcases%rowtype;
  v_image public.product_showcase_images%rowtype;
  v_next_primary public.product_showcase_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if
    p_showcase_id is null
    or p_image_id is null
  then
    raise exception
      'Product showcase and image IDs are required.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id = p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  select image.*
  into v_image
  from public.product_showcase_images image
  where image.id = p_image_id
    and image.showcase_id =
      p_showcase_id
    and image.identity_id =
      v_active_identity_id;

  if not found then
    raise exception
      'The product showcase image was not found.'
      using errcode = '22023';
  end if;

  select count(*)
  into v_image_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  if
    v_image_count <= 1
    and v_showcase.status = 'published'
  then
    raise exception
      'A published product showcase must keep at least one image.'
      using errcode = '22023';
  end if;

  delete from public.product_showcase_images image
  where image.id = p_image_id
    and image.showcase_id =
      p_showcase_id;

  select count(*)
  into v_remaining_count
  from public.product_showcase_images image
  where image.showcase_id =
    p_showcase_id;

  update public.product_showcase_images image
  set is_primary = false
  where image.showcase_id =
    p_showcase_id;

  if v_remaining_count > 0 then
    with ordered_images as (
      select
        image.id,
        (
          row_number() over (
            order by
              image.sort_order,
              image.created_at,
              image.id
          ) - 1
        )::integer as new_sort_order
      from public.product_showcase_images image
      where image.showcase_id =
        p_showcase_id
    )
    update public.product_showcase_images image
    set sort_order =
      ordered_images.new_sort_order
    from ordered_images
    where image.id =
      ordered_images.id;

    select image.*
    into v_next_primary
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id
    order by
      image.sort_order,
      image.created_at,
      image.id
    limit 1;

    update public.product_showcase_images image
    set is_primary = true
    where image.id =
      v_next_primary.id
    returning *
    into v_next_primary;

    v_fallback_image := coalesce(
      v_next_primary.medium_url,
      v_next_primary.original_url,
      v_next_primary.thumb_url
    );
  else
    v_fallback_image := null;
  end if;

  update public.product_showcases showcase
  set
    image_url = v_fallback_image,
    updated_at = now()
  where showcase.id =
    p_showcase_id;

  return jsonb_build_object(
    'deleted_image_id',
    v_image.id,
    'storage_path',
    v_image.storage_path,
    'deleted_urls',
    jsonb_build_array(
      v_image.thumb_url,
      v_image.medium_url,
      v_image.original_url
    ),
    'fallback_image',
    v_fallback_image,
    'remaining_count',
    v_remaining_count
  );
end;
$function$;

alter function
  public.delete_my_product_showcase_image_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.delete_my_product_showcase_image_v2(
    uuid,
    uuid
  )
is
  'Deletes an active-identity product showcase image and selects a replacement primary image.';

revoke all
on function
  public.delete_my_product_showcase_image_v2(
    uuid,
    uuid
  )
from public, anon;

grant execute
on function
  public.delete_my_product_showcase_image_v2(
    uuid,
    uuid
  )
to authenticated, service_role;


create or replace function
  public.set_my_product_showcase_status_v2(
    p_showcase_id uuid,
    p_status text
  )
returns setof public.product_showcases
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_status text :=
    lower(
      btrim(
        coalesce(p_status, '')
      )
    );

  v_primary_image_url text;
  v_showcase public.product_showcases%rowtype;
begin
  if p_showcase_id is null then
    raise exception
      'Product showcase ID is required.'
      using errcode = '22023';
  end if;

  if v_status not in (
    'draft',
    'published',
    'archived'
  ) then
    raise exception
      'Product showcase status is invalid.'
      using errcode = '22023';
  end if;

  select showcase.*
  into v_showcase
  from public.product_showcases showcase
  where showcase.id = p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The product showcase does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_status = 'published' then
    select coalesce(
      image.medium_url,
      image.original_url,
      image.thumb_url
    )
    into v_primary_image_url
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id
    order by
      image.is_primary desc,
      image.sort_order,
      image.created_at,
      image.id
    limit 1;

    if v_primary_image_url is null then
      raise exception
        'A product showcase must contain at least one image before publishing.'
        using errcode = '22023';
    end if;
  end if;

  update public.product_showcases showcase
  set
    status = v_status,
    image_url = coalesce(
      v_primary_image_url,
      showcase.image_url
    ),
    published_at =
      case
        when v_status = 'published'
          then coalesce(
            showcase.published_at,
            now()
          )
        else showcase.published_at
      end,
    updated_at = now()
  where showcase.id = p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  returning *
  into v_showcase;

  return next v_showcase;
  return;
end;
$function$;

alter function
  public.set_my_product_showcase_status_v2(
    uuid,
    text
  )
owner to postgres;

comment on function
  public.set_my_product_showcase_status_v2(
    uuid,
    text
  )
is
  'Changes product showcase status and requires at least one Storage-backed image before publishing.';

revoke all
on function
  public.set_my_product_showcase_status_v2(
    uuid,
    text
  )
from public, anon;

grant execute
on function
  public.set_my_product_showcase_status_v2(
    uuid,
    text
  )
to authenticated, service_role;
