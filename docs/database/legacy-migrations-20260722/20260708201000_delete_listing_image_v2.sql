create or replace function public.delete_listing_image_v2(
  p_listing_id text,
  p_image_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := auth.uid()::text;
  v_active_identity text;
  v_listing record;
  v_image record;
  v_row record;
  v_count integer := 0;
  v_index integer := 0;
  v_fallback_image text := null;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select active_identity_id::text
    into v_active_identity
  from profiles
  where id::text = v_user;

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
    if v_listing.user_id is null or v_listing.user_id::text <> v_user then
      raise exception 'not_owner';
    end if;
  end if;

  select count(*)
    into v_count
  from listing_images
  where listing_id::text = p_listing_id;

  if v_count <= 1 then
    raise exception 'last_image';
  end if;

  select id, thumb_url, medium_url, original_url
    into v_image
  from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  if not found then
    raise exception 'image_not_found';
  end if;

  delete from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  for v_row in
    select id, thumb_url, medium_url, original_url
    from listing_images
    where listing_id::text = p_listing_id
    order by
      coalesce(is_primary, false) desc,
      coalesce(sort_order, 999999),
      id::text
  loop
    update listing_images
    set
      is_primary = (v_index = 0),
      sort_order = v_index
    where id = v_row.id;

    if v_index = 0 then
      v_fallback_image := coalesce(
        v_row.original_url,
        v_row.medium_url,
        v_row.thumb_url
      );
    end if;

    v_index := v_index + 1;
  end loop;

  update listings
  set image = v_fallback_image
  where id::text = p_listing_id;

  return jsonb_build_object(
    'deleted_urls',
    jsonb_build_array(
      v_image.thumb_url,
      v_image.medium_url,
      v_image.original_url
    ),
    'fallback_image',
    v_fallback_image
  );
end;
$$;

grant execute on function public.delete_listing_image_v2(text, text) to authenticated;
