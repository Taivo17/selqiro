create or replace function public.add_listing_image_v2(
  p_listing_id text,
  p_original_url text,
  p_medium_url text default null,
  p_thumb_url text default null,
  p_max_images integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_user_text text := auth.uid()::text;
  v_active_identity text;
  v_listing record;
  v_count integer := 0;
  v_next_sort_order integer := 0;
  v_is_primary boolean := false;
  v_image_url text;
  v_inserted record;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_original_url is null or length(trim(p_original_url)) = 0 then
    raise exception 'image_url_missing';
  end if;

  select active_identity_id::text
    into v_active_identity
  from profiles
  where id = v_user;

  select id, user_id, identity_id
    into v_listing
  from listings
  where id::text = p_listing_id;

  if not found then
    raise exception 'listing_not_found';
  end if;

  if v_listing.identity_id is not null then
    if v_active_identity is null or v_listing.identity_id::text <> v_active_identity then
      raise exception 'not_owner';
    end if;
  else
    if v_listing.user_id is null or v_listing.user_id::text <> v_user_text then
      raise exception 'not_owner';
    end if;
  end if;

  select count(*)
    into v_count
  from listing_images
  where listing_id::text = p_listing_id;

  if v_count >= p_max_images then
    raise exception 'max_images';
  end if;

  v_is_primary := v_count = 0;

  select coalesce(max(sort_order), -1) + 1
    into v_next_sort_order
  from listing_images
  where listing_id::text = p_listing_id;

  insert into listing_images (
    listing_id,
    user_id,
    original_url,
    medium_url,
    thumb_url,
    is_primary,
    sort_order
  )
  values (
    v_listing.id,
    coalesce(v_listing.user_id, v_user),
    p_original_url,
    nullif(p_medium_url, ''),
    nullif(p_thumb_url, ''),
    v_is_primary,
    v_next_sort_order
  )
  returning id, original_url, medium_url, thumb_url, is_primary, sort_order
  into v_inserted;

  v_image_url := coalesce(
    v_inserted.original_url,
    v_inserted.medium_url,
    v_inserted.thumb_url
  );

  if v_is_primary and v_image_url is not null then
    update listings
    set image = v_image_url
    where id = v_listing.id;
  end if;

  return jsonb_build_object(
    'id', v_inserted.id,
    'image_url', v_image_url,
    'is_primary', v_inserted.is_primary,
    'sort_order', v_inserted.sort_order
  );
end;
$$;

grant execute on function public.add_listing_image_v2(text, text, text, text, integer) to authenticated;
