begin;


create or replace function
  public.add_my_service_image_v2(
    p_service_id uuid,
    p_original_url text,
    p_storage_path text,
    p_medium_url text default null,
    p_thumb_url text default null
  )
returns setof public.service_images
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_active_identity_id uuid;

  v_original_url text :=
    nullif(
      btrim(
        coalesce(
          p_original_url,
          ''
        )
      ),
      ''
    );

  v_medium_url text :=
    nullif(
      btrim(
        coalesce(
          p_medium_url,
          ''
        )
      ),
      ''
    );

  v_thumb_url text :=
    nullif(
      btrim(
        coalesce(
          p_thumb_url,
          ''
        )
      ),
      ''
    );

  v_storage_path text :=
    nullif(
      btrim(
        coalesce(
          p_storage_path,
          ''
        )
      ),
      ''
    );

  v_image_count integer;
  v_next_sort_order integer;
  v_is_primary boolean;

  v_service public.services%rowtype;
  v_inserted public.service_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_service_id is null then
    raise exception
      'Service ID is required.'
      using errcode = '22023';
  end if;

  if v_original_url is null then
    raise exception
      'Service image original URL is required.'
      using errcode = '22023';
  end if;

  if char_length(v_original_url) > 2000 then
    raise exception
      'Service image original URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if (
    v_medium_url is not null
    and char_length(v_medium_url) > 2000
  ) then
    raise exception
      'Service image medium URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if (
    v_thumb_url is not null
    and char_length(v_thumb_url) > 2000
  ) then
    raise exception
      'Service image thumbnail URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if v_storage_path is null then
    raise exception
      'Service image Storage path is required.'
      using errcode = '22023';
  end if;

  if char_length(v_storage_path) > 1000 then
    raise exception
      'Service image Storage path cannot be longer than 1000 characters.'
      using errcode = '22023';
  end if;

  if (
    coalesce(
      (
        storage.foldername(
          v_storage_path
        )
      )[1],
      ''
    ) <> v_user_id::text
    or coalesce(
      (
        storage.foldername(
          v_storage_path
        )
      )[2],
      ''
    ) <> p_service_id::text
  ) then
    raise exception
      'Service image Storage path must use the authenticated user and service IDs.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity is not accessible.'
      using errcode = '42501';
  end if;

  select service.*
  into v_service
  from public.services service
  where service.id =
    p_service_id
    and service.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The service does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_service.status <> 'draft' then
    raise exception
      'Service images can be changed only while the service is a draft.'
      using errcode = '22023';
  end if;

  select count(*)
  into v_image_count
  from public.service_images image
  where image.service_id =
    p_service_id;

  if v_image_count >= 10 then
    raise exception
      'A service can contain at most 10 images.'
      using errcode = '22023';
  end if;

  select
    coalesce(
      max(image.sort_order),
      -1
    ) + 1
  into v_next_sort_order
  from public.service_images image
  where image.service_id =
    p_service_id;

  v_is_primary :=
    v_image_count = 0;

  insert into public.service_images (
    service_id,
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
    p_service_id,
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
    update public.services service
    set
      image_url = coalesce(
        v_inserted.medium_url,
        v_inserted.original_url,
        v_inserted.thumb_url
      ),
      updated_at = now()
    where service.id =
      p_service_id;
  end if;

  return next v_inserted;
  return;
end;
$function$;

alter function
  public.add_my_service_image_v2(
    uuid,
    text,
    text,
    text,
    text
  )
owner to postgres;

comment on function
  public.add_my_service_image_v2(
    uuid,
    text,
    text,
    text,
    text
  )
is
  'Registers a Storage-backed image for an active-identity draft service and enforces a ten-image limit.';

revoke all
on function
  public.add_my_service_image_v2(
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon;

grant execute
on function
  public.add_my_service_image_v2(
    uuid,
    text,
    text,
    text,
    text
  )
to authenticated, service_role;


create or replace function
  public.set_my_service_primary_image_v2(
    p_service_id uuid,
    p_image_id uuid
  )
returns setof public.service_images
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_active_identity_id uuid;
  v_primary_url text;

  v_service public.services%rowtype;
  v_image public.service_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if (
    p_service_id is null
    or p_image_id is null
  ) then
    raise exception
      'Service and image IDs are required.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity is not accessible.'
      using errcode = '42501';
  end if;

  select service.*
  into v_service
  from public.services service
  where service.id =
    p_service_id
    and service.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The service does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_service.status <> 'draft' then
    raise exception
      'Service images can be changed only while the service is a draft.'
      using errcode = '22023';
  end if;

  select image.*
  into v_image
  from public.service_images image
  where image.id =
    p_image_id
    and image.service_id =
      p_service_id
    and image.identity_id =
      v_active_identity_id;

  if not found then
    raise exception
      'The service image was not found.'
      using errcode = '22023';
  end if;

  update public.service_images image
  set is_primary = false
  where image.service_id =
    p_service_id;

  with ordered_images as (
    select
      image.id,
      (
        row_number() over (
          order by
            case
              when image.id =
                p_image_id
                then 0
              else 1
            end,
            image.sort_order,
            image.created_at,
            image.id
        ) - 1
      )::integer as next_sort_order
    from public.service_images image
    where image.service_id =
      p_service_id
  )
  update public.service_images image
  set sort_order =
    ordered_images.next_sort_order
  from ordered_images
  where image.id =
    ordered_images.id;

  update public.service_images image
  set is_primary = true
  where image.id =
    p_image_id
    and image.service_id =
      p_service_id
  returning *
  into v_image;

  v_primary_url := coalesce(
    v_image.medium_url,
    v_image.original_url,
    v_image.thumb_url
  );

  update public.services service
  set
    image_url =
      v_primary_url,
    updated_at =
      now()
  where service.id =
    p_service_id;

  return next v_image;
  return;
end;
$function$;

alter function
  public.set_my_service_primary_image_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.set_my_service_primary_image_v2(
    uuid,
    uuid
  )
is
  'Sets and reorders the primary image of an active-identity draft service.';

revoke all
on function
  public.set_my_service_primary_image_v2(
    uuid,
    uuid
  )
from public, anon;

grant execute
on function
  public.set_my_service_primary_image_v2(
    uuid,
    uuid
  )
to authenticated, service_role;


create or replace function
  public.delete_my_service_image_v2(
    p_service_id uuid,
    p_image_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_active_identity_id uuid;
  v_remaining_count integer;
  v_fallback_image text;

  v_service public.services%rowtype;
  v_image public.service_images%rowtype;
  v_next_primary public.service_images%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if (
    p_service_id is null
    or p_image_id is null
  ) then
    raise exception
      'Service and image IDs are required.'
      using errcode = '22023';
  end if;

  v_active_identity_id :=
    public.require_my_active_identity_v2();

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity is not accessible.'
      using errcode = '42501';
  end if;

  select service.*
  into v_service
  from public.services service
  where service.id =
    p_service_id
    and service.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The service does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  if v_service.status <> 'draft' then
    raise exception
      'Service images can be changed only while the service is a draft.'
      using errcode = '22023';
  end if;

  select image.*
  into v_image
  from public.service_images image
  where image.id =
    p_image_id
    and image.service_id =
      p_service_id
    and image.identity_id =
      v_active_identity_id
  for update;

  if not found then
    raise exception
      'The service image was not found.'
      using errcode = '22023';
  end if;

  delete from public.service_images image
  where image.id =
    p_image_id
    and image.service_id =
      p_service_id;

  select count(*)
  into v_remaining_count
  from public.service_images image
  where image.service_id =
    p_service_id;

  if v_remaining_count > 0 then
    select image.*
    into v_next_primary
    from public.service_images image
    where image.service_id =
      p_service_id
    order by
      image.is_primary desc,
      image.sort_order,
      image.created_at,
      image.id
    limit 1;

    update public.service_images image
    set is_primary = false
    where image.service_id =
      p_service_id;

    with ordered_images as (
      select
        image.id,
        (
          row_number() over (
            order by
              case
                when image.id =
                  v_next_primary.id
                  then 0
                else 1
              end,
              image.sort_order,
              image.created_at,
              image.id
          ) - 1
        )::integer as next_sort_order
      from public.service_images image
      where image.service_id =
        p_service_id
    )
    update public.service_images image
    set sort_order =
      ordered_images.next_sort_order
    from ordered_images
    where image.id =
      ordered_images.id;

    update public.service_images image
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

  update public.services service
  set
    image_url =
      v_fallback_image,
    updated_at =
      now()
  where service.id =
    p_service_id;

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
    'primary_image_id',
    case
      when v_remaining_count > 0
        then v_next_primary.id
      else null
    end,
    'remaining_count',
    v_remaining_count
  );
end;
$function$;

alter function
  public.delete_my_service_image_v2(
    uuid,
    uuid
  )
owner to postgres;

comment on function
  public.delete_my_service_image_v2(
    uuid,
    uuid
  )
is
  'Deletes an active-identity draft service image, allows the final image to be removed and selects a deterministic replacement primary.';

revoke all
on function
  public.delete_my_service_image_v2(
    uuid,
    uuid
  )
from public, anon;

grant execute
on function
  public.delete_my_service_image_v2(
    uuid,
    uuid
  )
to authenticated, service_role;


commit;
