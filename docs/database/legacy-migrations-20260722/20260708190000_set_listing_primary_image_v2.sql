create or replace function public.set_listing_primary_image_v2(
  p_listing_id text,
  p_image_id text
)
returns void
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
  v_index integer := 0;
  v_fallback_image text;
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

  select id, thumb_url, medium_url, original_url
    into v_image
  from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  if not found then
    raise exception 'image_not_found';
  end if;

  for v_row in
    select id
    from listing_images
    where listing_id::text = p_listing_id
    order by
      case when id::text = p_image_id then 0 else 1 end,
      coalesce(sort_order, 999999),
      id::text
  loop
    update listing_images
    set
      is_primary = (v_row.id::text = p_image_id),
      sort_order = v_index
    where id = v_row.id;

    v_index := v_index + 1;
  end loop;

  v_fallback_image := coalesce(
    v_image.original_url,
    v_image.medium_url,
    v_image.thumb_url
  );

  if v_fallback_image is not null then
    update listings
    set image = v_fallback_image
    where id::text = p_listing_id;
  end if;
end;
$$;

grant execute on function public.set_listing_primary_image_v2(text, text) to authenticated;
