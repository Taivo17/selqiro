begin;

create or replace function public.update_my_listing_classification_location_v2(
  p_listing_id text,
  p_category text,
  p_subcategory text default null,
  p_detail_category text default null,
  p_country text default null,
  p_city text default null,
  p_listing_lat double precision default null,
  p_listing_lng double precision default null
)
returns table (
  listing_id bigint,
  category text,
  subcategory text,
  detail_category text,
  country text,
  city text,
  location text,
  listing_lat double precision,
  listing_lng double precision,
  changed boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_listing_id bigint;
  v_listing_user_id uuid;
  v_listing_identity_id uuid;

  v_title text;
  v_description text;
  v_condition text;

  v_existing_category text;
  v_existing_subcategory text;
  v_existing_details jsonb;
  v_existing_country text;
  v_existing_city text;
  v_existing_location text;
  v_existing_listing_lat double precision;
  v_existing_listing_lng double precision;
  v_existing_search_text text;

  v_clean_category text;
  v_clean_subcategory text;
  v_clean_detail_category text;
  v_clean_country text;
  v_clean_city text;

  v_new_details jsonb;
  v_new_location text;
  v_details_search_text text;
  v_new_search_text text;
  v_changed boolean;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_listing_id is null
    or btrim(p_listing_id) = ''
    or btrim(p_listing_id) !~ '^[1-9][0-9]*$'
  then
    raise exception
      'The listing ID is invalid.'
      using errcode = '22023';
  end if;

  v_listing_id := btrim(p_listing_id)::bigint;

  /*
   * Lock the profile row so an active-identity switch
   * cannot race this listing update.
   */
  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      v_active_identity_id
    ),
    false
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  v_clean_category := nullif(
    regexp_replace(
      btrim(coalesce(p_category, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_subcategory := nullif(
    regexp_replace(
      btrim(coalesce(p_subcategory, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_detail_category := nullif(
    regexp_replace(
      btrim(coalesce(p_detail_category, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_country := nullif(
    regexp_replace(
      btrim(coalesce(p_country, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_city := nullif(
    regexp_replace(
      btrim(coalesce(p_city, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  if v_clean_category is null then
    raise exception
      'The Selqiro category is required.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_category) > 120 then
    raise exception
      'The Selqiro category is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_subcategory, '')) > 160 then
    raise exception
      'The Selqiro subcategory is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_detail_category, '')) > 160 then
    raise exception
      'The detailed Selqiro category is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_country, '')) > 120 then
    raise exception
      'The country is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_city, '')) > 160 then
    raise exception
      'The city or region is too long.'
      using errcode = '22023';
  end if;

  /*
   * Coordinates must be supplied as a complete pair.
   */
  if (
    p_listing_lat is null
    and p_listing_lng is not null
  ) or (
    p_listing_lat is not null
    and p_listing_lng is null
  ) then
    raise exception
      'Latitude and longitude must be supplied together.'
      using errcode = '22023';
  end if;

  if p_listing_lat is not null then
    if p_listing_lat::text in (
      'NaN',
      'Infinity',
      '-Infinity'
    ) or p_listing_lat < -90
      or p_listing_lat > 90
    then
      raise exception
        'Latitude is invalid.'
        using errcode = '22023';
    end if;

    if p_listing_lng::text in (
      'NaN',
      'Infinity',
      '-Infinity'
    ) or p_listing_lng < -180
      or p_listing_lng > 180
    then
      raise exception
        'Longitude is invalid.'
        using errcode = '22023';
    end if;
  end if;

  /*
   * Lock the listing before checking ownership and
   * before changing classification or location.
   */
  select
    listing.user_id,
    listing.identity_id,
    listing.title,
    listing.description,
    listing.condition,
    listing.category,
    listing.subcategory,
    listing.details,
    listing.country,
    listing.city,
    listing.location,
    listing.listing_lat,
    listing.listing_lng,
    listing.search_text
  into
    v_listing_user_id,
    v_listing_identity_id,
    v_title,
    v_description,
    v_condition,
    v_existing_category,
    v_existing_subcategory,
    v_existing_details,
    v_existing_country,
    v_existing_city,
    v_existing_location,
    v_existing_listing_lat,
    v_existing_listing_lng,
    v_existing_search_text
  from public.listings listing
  where listing.id = v_listing_id
  for update;

  if not found then
    raise exception
      'The listing does not exist.'
      using errcode = '22023';
  end if;

  /*
   * Identity-first ownership:
   *
   * - an identity-owned listing requires the current
   *   active identity;
   * - user_id is only a fallback for a genuine legacy
   *   listing without identity_id.
   */
  if v_listing_identity_id is not null then
    if v_listing_identity_id <> v_active_identity_id then
      raise exception
        'The listing does not belong to the active identity.'
        using errcode = '42501';
    end if;
  elsif v_listing_user_id is distinct from v_user_id then
    raise exception
      'The legacy listing does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  v_existing_details :=
    coalesce(
      v_existing_details,
      '{}'::jsonb
    );

  if jsonb_typeof(v_existing_details) <> 'object' then
    raise exception
      'The listing details must be a JSON object.'
      using errcode = '22023';
  end if;

  /*
   * Preserve every existing detail field. Only the
   * global-category detailCategory key is replaced.
   */
  v_new_details :=
    v_existing_details
    - 'detailCategory';

  if v_clean_detail_category is not null then
    v_new_details := jsonb_set(
      v_new_details,
      '{detailCategory}',
      to_jsonb(v_clean_detail_category),
      true
    );
  end if;

  /*
   * The display location is derived server-side so the
   * country/city columns and location label cannot drift.
   */
  v_new_location := nullif(
    concat_ws(
      ' • ',
      v_clean_country,
      v_clean_city
    ),
    ''
  );

  select string_agg(
    detail.detail_value,
    ' '
  )
  into v_details_search_text
  from jsonb_each_text(
    v_new_details
  ) as detail(
    detail_key,
    detail_value
  );

  /*
   * Rebuild search_text with classification, location
   * and all preserved detail values. The existing
   * listings trigger rebuilds search_vector.
   */
  v_new_search_text := lower(
    regexp_replace(
      btrim(
        concat_ws(
          ' ',
          v_title,
          v_description,
          v_clean_category,
          v_clean_subcategory,
          v_clean_detail_category,
          v_condition,
          v_clean_country,
          v_clean_city,
          v_details_search_text
        )
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  v_changed :=
    v_existing_category
      is distinct from v_clean_category
    or v_existing_subcategory
      is distinct from v_clean_subcategory
    or v_existing_details
      is distinct from v_new_details
    or v_existing_country
      is distinct from v_clean_country
    or v_existing_city
      is distinct from v_clean_city
    or v_existing_location
      is distinct from v_new_location
    or v_existing_listing_lat
      is distinct from p_listing_lat
    or v_existing_listing_lng
      is distinct from p_listing_lng
    or v_existing_search_text
      is distinct from v_new_search_text;

  if v_changed then
    update public.listings listing
    set
      category = v_clean_category,
      subcategory = v_clean_subcategory,
      details = v_new_details,
      country = v_clean_country,
      city = v_clean_city,
      location = v_new_location,
      listing_lat = p_listing_lat,
      listing_lng = p_listing_lng,
      search_text = v_new_search_text,
      updated_by_user_id = v_user_id
    where listing.id = v_listing_id;
  end if;

  return query
  select
    v_listing_id,
    v_clean_category,
    v_clean_subcategory,
    v_clean_detail_category,
    v_clean_country,
    v_clean_city,
    v_new_location,
    p_listing_lat,
    p_listing_lng,
    v_changed;
end;
$function$;

comment on function public.update_my_listing_classification_location_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
) is
  'Updates Selqiro global classification and listing location for a listing owned by the authenticated user active identity. Preserves listing store-category links and all details except details.detailCategory.';

revoke all
on function public.update_my_listing_classification_location_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
)
from public, anon, authenticated;

grant execute
on function public.update_my_listing_classification_location_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision
)
to authenticated;

commit;
