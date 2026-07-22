


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text" DEFAULT NULL::"text", "p_thumb_url" "text" DEFAULT NULL::"text", "p_max_images" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text", "p_thumb_url" "text", "p_max_images" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_dashboard_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;

  return jsonb_build_object(
    'users', (
      select count(*) from profiles
    ),
    'identities', (
      select count(*) from identity_profiles
    ),
    'listings', (
      select count(*) from listings
    ),
    'openReports', (
      select count(*) from reports where status = 'open'
    ),
    'blocks', (
      select count(*) from user_blocks
    ),
    'follows', (
      select count(*) from store_follows
    )
  );
end;
$$;


ALTER FUNCTION "public"."admin_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_identities_list"() RETURNS TABLE("identity_id" "uuid", "display_name" "text", "slug" "text", "owner_user_id" "uuid", "owner_email" "text", "listings_count" bigint, "followers_count" bigint, "reports_count" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;

  return query
  select
    ip.identity_id,
    ip.display_name::text,
    ip.slug::text,
    ip.created_by_user_id as owner_user_id,
    p.email::text as owner_email,
    (
      select count(*)
      from listings l
      where l.identity_id = ip.identity_id
    ) as listings_count,
    (
      select count(*)
      from store_follows sf
      where sf.store_identity_id = ip.identity_id
    ) as followers_count,
    (
      select count(*)
      from reports r
      where r.reported_user_id = ip.created_by_user_id
    ) as reports_count,
    ip.created_at
  from identity_profiles ip
  left join profiles p
    on p.id = ip.created_by_user_id
  order by ip.created_at desc;
end;
$$;


ALTER FUNCTION "public"."admin_identities_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_identity_detail"("p_identity_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from admin_users
    where user_id = auth.uid()
      and is_active = true
  ) then
    raise exception 'not allowed';
  end if;

  return (
    select jsonb_build_object(
      'identity_id', ip.identity_id,
      'display_name', ip.display_name,
      'slug', ip.slug,
      'bio', ip.bio,
      'city', ip.city,
      'country', ip.country,
      'created_at', ip.created_at,
      'plan', coalesce(ip.plan, 'free'),
      'owner_email', p.email,
      'listings_count', (
        select count(*) from listings l
        where l.identity_id = ip.identity_id
      ),
      'followers_count', 0,
      'reports_count', (
        select count(*) from reports r
        where r.reported_user_id = ip.identity_id
      )
    )
    from identity_profiles ip
    left join profiles p on p.id = ip.created_by_user_id
    where ip.identity_id = p_identity_id
    limit 1
  );
end;
$$;


ALTER FUNCTION "public"."admin_identity_detail"("p_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_identity_plan"("p_identity_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_plan text;
begin
  if not exists (
    select 1
    from admin_users
    where user_id = auth.uid()
      and is_active = true
  ) then
    raise exception 'not allowed';
  end if;

  select coalesce(plan, 'free')
  into v_plan
  from identity_profiles
  where identity_id = p_identity_id
  limit 1;

  return coalesce(v_plan, 'free');
end;
$$;


ALTER FUNCTION "public"."admin_identity_plan"("p_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_report_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;

  return jsonb_build_object(
    'open', (select count(*) from reports where status = 'open'),
    'reviewing', (select count(*) from reports where status = 'reviewing'),
    'actioned', (select count(*) from reports where status = 'actioned'),
    'dismissed', (select count(*) from reports where status = 'dismissed'),
    'total', (select count(*) from reports)
  );
end;
$$;


ALTER FUNCTION "public"."admin_report_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reports_list"() RETURNS TABLE("id" bigint, "reporter_id" "uuid", "reporter_email" "text", "reporter_name" "text", "reported_user_id" "uuid", "reported_email" "text", "reported_name" "text", "report_type" "text", "reason" "text", "details" "text", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;

  return query
  select
    r.id::bigint,
    r.reporter_id,
    rp.email::text as reporter_email,
    coalesce(rip.display_name::text, rp.email::text, 'Unknown') as reporter_name,
    r.reported_user_id,
    tp.email::text as reported_email,
    coalesce(tip.display_name::text, tp.email::text, 'Unknown') as reported_name,
    r.report_type::text,
    r.reason::text,
    r.details::text,
    r.status::text,
    r.created_at
  from reports r
  left join profiles rp
    on rp.id = r.reporter_id
  left join lateral (
    select ip.display_name
    from identity_profiles ip
    where ip.created_by_user_id = r.reporter_id
    order by ip.created_at asc
    limit 1
  ) rip on true
  left join profiles tp
    on tp.id = r.reported_user_id
  left join lateral (
    select ip.display_name
    from identity_profiles ip
    where ip.created_by_user_id = r.reported_user_id
    order by ip.created_at asc
    limit 1
  ) tip on true
  order by r.created_at desc, r.id desc
  limit 100;
end;
$$;


ALTER FUNCTION "public"."admin_reports_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_identity_plan"("p_identity_id" "uuid", "p_plan" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    if not is_admin() then
        raise exception 'not allowed';
    end if;

    if p_plan not in ('free','premium','business') then
        raise exception 'invalid plan';
    end if;

    update identity_profiles
    set
        plan = p_plan,
        updated_at = now()
    where identity_id = p_identity_id;

    return found;
end;
$$;


ALTER FUNCTION "public"."admin_set_identity_plan"("p_identity_id" "uuid", "p_plan" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_report_status"("p_report_id" bigint, "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not is_admin() then
    raise exception 'not allowed';
  end if;

  if p_status not in ('open', 'reviewing', 'actioned', 'dismissed') then
    raise exception 'invalid report status';
  end if;

  update reports
  set status = p_status
  where id = p_report_id;

  return true;
end;
$$;


ALTER FUNCTION "public"."admin_update_report_status"("p_report_id" bigint, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_conversation_if_all_deleted"("target_conversation_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from conversation_participants
    where conversation_id = target_conversation_id
      and user_id = auth.uid()
  ) then
    raise exception 'Not allowed';
  end if;

  update conversations
  set archived_at = now()
  where id = target_conversation_id
    and not exists (
      select 1
      from conversation_participants
      where conversation_id = target_conversation_id
        and deleted_at is null
    );
end;
$$;


ALTER FUNCTION "public"."archive_conversation_if_all_deleted"("target_conversation_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_store_identity_owner"("p_store_identity_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_blocked_user_id uuid;
begin
  select created_by_user_id
  into v_blocked_user_id
  from identity_profiles
  where identity_id = p_store_identity_id
  limit 1;

  if v_user_id is null or p_store_identity_id is null or v_blocked_user_id is null then
    return 'missing';
  end if;

  if v_blocked_user_id = v_user_id then
    return 'own_identity';
  end if;

  insert into user_blocks (blocker_id, blocked_id)
  values (v_user_id, v_blocked_user_id)
  on conflict do nothing;

  return 'blocked';
end;
$$;


ALTER FUNCTION "public"."block_store_identity_owner"("p_store_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_premium_invite"("input_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  invite_row public.premium_invites%rowtype;
  new_premium_until timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  end if;

  select *
  into invite_row
  from public.premium_invites
  where invite_code = input_code
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'Invite not found'
    );
  end if;

  if invite_row.claimed_by is not null or invite_row.uses_count >= invite_row.max_uses then
    return jsonb_build_object(
      'success', false,
      'message', 'Invite already used'
    );
  end if;

  if invite_row.expires_at is not null and invite_row.expires_at <= now() then
    return jsonb_build_object(
      'success', false,
      'message', 'Invite expired'
    );
  end if;

  if invite_row.created_by = auth.uid() then
    return jsonb_build_object(
      'success', false,
      'message', 'You cannot claim your own invite'
    );
  end if;

  select
    greatest(coalesce(premium_until, now()), now()) + (invite_row.premium_days || ' days')::interval
  into new_premium_until
  from public.profiles
  where id = auth.uid();

  update public.profiles
  set
    is_premium = true,
    premium_until = new_premium_until
  where id = auth.uid();

  update public.premium_invites
  set
    claimed_by = auth.uid(),
    claimed_at = now(),
    uses_count = 1
  where id = invite_row.id;

  return jsonb_build_object(
    'success', true,
    'message', 'Premium activated',
    'premium_until', new_premium_until
  );
end;
$$;


ALTER FUNCTION "public"."claim_premium_invite"("input_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") RETURNS TABLE("id" "uuid", "name" "text", "sort_order" integer, "parent_id" "uuid", "identity_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_parent_identity_id uuid;
  v_parent_parent_id uuid;

  v_clean_name text;
  v_next_sort_order integer;

  v_created_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_parent_id is null then
    raise exception
      'Parent store category is required.'
      using errcode = '22023';
  end if;

  v_clean_name := regexp_replace(
    btrim(coalesce(p_name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if char_length(v_clean_name) = 0 then
    raise exception
      'Store category name cannot be empty.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_name) > 60 then
    raise exception
      'Store category name cannot be longer than 60 characters.'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock the selected parent while the next child sort order is
   * calculated. The parent must exist and belong to the active identity.
   */
  select
    category.identity_id,
    category.parent_id
  into
    v_parent_identity_id,
    v_parent_parent_id
  from public.store_categories category
  where category.id = p_parent_id
  for update;

  if not found then
    raise exception
      'The selected parent store category does not exist.'
      using errcode = '22023';
  end if;

  if v_parent_identity_id is distinct from v_active_identity_id then
    raise exception
      'The selected parent does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * V2 exposes exactly two levels:
   * root -> direct child.
   *
   * The table model itself remains capable of deeper hierarchy later.
   */
  if v_parent_parent_id is not null then
    raise exception
      'V2 child categories can only be added under a root category.'
      using errcode = '22023';
  end if;

  select
    coalesce(max(category.sort_order), -1) + 1
  into v_next_sort_order
  from public.store_categories category
  where category.identity_id = v_active_identity_id
    and category.parent_id = p_parent_id;

  insert into public.store_categories (
    user_id,
    identity_id,
    parent_id,
    name,
    sort_order
  )
  values (
    v_user_id,
    v_active_identity_id,
    p_parent_id,
    v_clean_name,
    v_next_sort_order
  )
  returning *
  into v_created_category;

  return query
  select
    v_created_category.id,
    v_created_category.name,
    v_created_category.sort_order,
    v_created_category.parent_id,
    v_created_category.identity_id;

exception
  when unique_violation then
    raise exception
      'A child store category with this name already exists under the selected root.'
      using errcode = '23505';
end;
$$;


ALTER FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") IS 'Creates one direct child category under a root category belonging to the authenticated user active identity. V2 allows two UI levels.';



CREATE OR REPLACE FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") RETURNS TABLE("id" "uuid", "name" "text", "sort_order" integer, "parent_id" "uuid", "identity_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
  v_clean_name text;
  v_next_sort_order integer;
  v_created_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  v_clean_name := regexp_replace(
    btrim(coalesce(p_name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if char_length(v_clean_name) = 0 then
    raise exception
      'Store category name cannot be empty.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_name) > 60 then
    raise exception
      'Store category name cannot be longer than 60 characters.'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  select
    coalesce(max(category.sort_order), -1) + 1
  into v_next_sort_order
  from public.store_categories category
  where category.identity_id = v_active_identity_id
    and category.parent_id is null;

  insert into public.store_categories (
    user_id,
    identity_id,
    parent_id,
    name,
    sort_order
  )
  values (
    v_user_id,
    v_active_identity_id,
    null,
    v_clean_name,
    v_next_sort_order
  )
  returning *
  into v_created_category;

  return query
  select
    v_created_category.id,
    v_created_category.name,
    v_created_category.sort_order,
    v_created_category.parent_id,
    v_created_category.identity_id;

exception
  when unique_violation then
    raise exception
      'A root store category with this name already exists.'
      using errcode = '23505';
end;
$$;


ALTER FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") IS 'Creates one root store category for the authenticated user active identity. The client does not provide identity_id or parent_id.';



CREATE OR REPLACE FUNCTION "public"."create_premium_invite"("premium_days_input" integer DEFAULT 30, "expires_in_days_input" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_code text;
  new_expires_at timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
  new_expires_at := now() + (expires_in_days_input || ' days')::interval;

  insert into public.premium_invites (
    invite_code,
    created_by,
    premium_days,
    max_uses,
    uses_count,
    expires_at
  )
  values (
    new_code,
    auth.uid(),
    premium_days_input,
    1,
    0,
    new_expires_at
  );

  return jsonb_build_object(
    'success', true,
    'invite_code', new_code,
    'premium_days', premium_days_input,
    'expires_at', new_expires_at
  );
end;
$$;


ALTER FUNCTION "public"."create_premium_invite"("premium_days_input" integer, "expires_in_days_input" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id = p_identity_id
        and identity.status = 'active'
        and (
          (
            identity.type = 'private'
            and identity.user_id = auth.uid()
          )
          or
          (
            identity.type = 'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
    );
$$;


ALTER FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") IS 'Internal authorization helper. Returns true when the authenticated user owns an active private identity or is an active member of the business identity.';



CREATE OR REPLACE FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") RETURNS TABLE("deleted_category_id" "uuid", "deleted_name" "text", "deleted_parent_id" "uuid", "deleted_level" "text", "removed_listing_links" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_category_name text;
  v_parent_id uuid;

  v_child_count integer;
  v_removed_listing_links integer := 0;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_category_id is null then
    raise exception
      'Store category is required.'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock the selected category.
   *
   * The category must belong to the current active identity.
   * The row lock also prevents a concurrent child insertion while
   * the deletion checks are running.
   */
  select
    category.name,
    category.parent_id
  into
    v_category_name,
    v_parent_id
  from public.store_categories category
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id
  for update;

  if not found then
    raise exception
      'The store category does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Never cascade-delete child categories.
   *
   * A root category must first be emptied by deleting or moving
   * its direct children through separate user-confirmed actions.
   */
  select count(*)::integer
  into v_child_count
  from public.store_categories child
  where child.parent_id = p_category_id;

  if v_child_count > 0 then
    raise exception
      'The store category has child categories and cannot be deleted.'
      using errcode = '23503';
  end if;

  /*
   * Remove only listing/category relations.
   *
   * Listings themselves remain untouched. Although the foreign key
   * also uses ON DELETE CASCADE, explicit deletion lets the RPC return
   * the exact number of removed relations.
   */
  with deleted_links as (
    delete from public.listing_store_categories relation
    where relation.store_category_id = p_category_id
    returning 1
  )
  select count(*)::integer
  into v_removed_listing_links
  from deleted_links;

  delete from public.store_categories category
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id;

  if not found then
    raise exception
      'The store category could not be deleted.'
      using errcode = '40001';
  end if;

  return query
  select
    p_category_id,
    v_category_name,
    v_parent_id,
    case
      when v_parent_id is null then 'root'
      else 'child'
    end::text,
    v_removed_listing_links;
end;
$$;


ALTER FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") IS 'Deletes one child category or one childless root category belonging to the authenticated user active identity. Listings remain intact; only listing/category relations are removed.';



CREATE OR REPLACE FUNCTION "public"."get_feed_identity_profiles"("p_identity_ids" "uuid"[]) RETURNS TABLE("identity_id" "uuid", "display_name" "text", "slug" "text", "avatar_url" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.identity_id,
    ip.display_name,
    ip.slug,
    ip.avatar_url
  from identity_profiles ip
  where ip.identity_id = any(p_identity_ids);
$$;


ALTER FUNCTION "public"."get_feed_identity_profiles"("p_identity_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") RETURNS TABLE("display_name" "text", "slug" "text", "avatar_url" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.display_name,
    ip.slug,
    ip.avatar_url
  from identity_profiles ip
  where ip.identity_id = p_identity_id
  limit 1;
$$;


ALTER FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_identity_profile_slug"("p_identity_id" "uuid") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select ip.slug
  from identity_profiles ip
  where ip.identity_id = p_identity_id
  limit 1;
$$;


ALTER FUNCTION "public"."get_identity_profile_slug"("p_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_identity_store_follow_status_v2"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") RETURNS TABLE("is_following" boolean, "followers_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    exists (
      select 1
      from store_follows sf
      where sf.follower_identity_id = p_follower_identity_id
        and sf.store_identity_id = p_store_identity_id
    ) as is_following,
    (
      select count(*)
      from store_follows sf
      where sf.store_identity_id = p_store_identity_id
    ) as followers_count;
$$;


ALTER FUNCTION "public"."get_identity_store_follow_status_v2"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_listing_details"("p_listing_id" bigint) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "title" "text", "description" "text", "price" "text", "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "manufacturer" "text", "part_number" "text", "oem_number" "text", "vehicle_brand" "text", "vehicle_model" "text", "vehicle_year" "text", "engine" "text", "details" "jsonb", "ai_status" "text", "ai_level" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    l.id,
    l.user_id,
    l.identity_id,

    ip.display_name,
    ip.slug,
    i.type,

    l.title,
    l.description,
    l.price,
    l.image,

    l.category,
    l.subcategory,
    l.condition,
    l.country,
    l.city,
    l.location,

    l.manufacturer,
    l.part_number,
    l.oem_number,
    l.vehicle_brand,
    l.vehicle_model,
    l.vehicle_year,
    l.engine,

    l.details,
    l.ai_status,
    l.ai_level,
    l.created_at
  from listings l
  join identities i
    on i.id = l.identity_id
  join identity_profiles ip
    on ip.identity_id = i.id
  where l.id = p_listing_id
  limit 1;
$$;


ALTER FUNCTION "public"."get_listing_details"("p_listing_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketplace_identity_location"() RETURNS TABLE("country" "text", "city" "text", "lat" double precision, "lng" double precision)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.country,
    ip.city,
    ip.lat,
    ip.lng
  from profiles p
  join identity_profiles ip
    on ip.identity_id = p.active_identity_id
  where p.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_marketplace_identity_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    l.id,
    l.user_id,
    l.identity_id,

    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),

    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),

    l.category,
    l.subcategory,
    l.condition,

    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,

    l.search_text,
    l.details,

    l.active_until,
    l.created_at

  from listings l
  join identities i
    on i.id = l.identity_id
  join identity_profiles ip
    on ip.identity_id = i.id
  left join profiles p
    on p.id = i.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where l.status = 'active'
    and (
      l.active_until is null
      or l.active_until > now()
    )
  order by l.created_at desc
  limit result_limit
  offset result_offset;
$$;


ALTER FUNCTION "public"."get_marketplace_listings"("result_limit" integer, "result_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision DEFAULT NULL::double precision, "center_lng" double precision DEFAULT NULL::double precision, "result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "distance_km" double precision, "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    l.id,
    l.user_id,
    l.identity_id,
    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),
    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),
    l.category,
    l.subcategory,
    l.condition,
    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,
    l.search_text,
    l.details,
    case
      when center_lat is not null
       and center_lng is not null
       and l.listing_lat is not null
       and l.listing_lng is not null
      then 6371 * 2 * asin(
        sqrt(
          power(sin(radians(l.listing_lat - center_lat) / 2), 2) +
          cos(radians(center_lat)) *
          cos(radians(l.listing_lat)) *
          power(sin(radians(l.listing_lng - center_lng) / 2), 2)
        )
      )
      else null
    end as distance_km,
    l.active_until,
    l.created_at
  from listings l
  join identities i on i.id = l.identity_id
  join identity_profiles ip on ip.identity_id = i.id
  left join profiles p on p.id = l.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where l.status = 'active'
    and (l.active_until is null or l.active_until > now())
  order by
    case when center_lat is not null and center_lng is not null then
      case
        when l.listing_lat is null or l.listing_lng is null then 1
        else 0
      end
    else 0 end,
    distance_km asc nulls last,
    l.created_at desc
  limit result_limit
  offset result_offset;
$$;


ALTER FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision, "center_lng" double precision, "result_limit" integer, "result_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_active_identity_profile"() RETURNS TABLE("id" "uuid", "identity_id" "uuid", "display_name" "text", "slug" "text", "bio" "text", "avatar_url" "text", "banner_url" "text", "banner_dominant_color" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.id,
    ip.identity_id,
    ip.display_name,
    ip.slug,
    ip.bio,
    ip.avatar_url,
    ip.banner_url,
    ip.banner_dominant_color
  from profiles p
  join identity_profiles ip
    on ip.identity_id = p.active_identity_id
  where p.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_active_identity_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_active_identity_profile_details"() RETURNS TABLE("identity_id" "uuid", "display_name" "text", "slug" "text", "country" "text", "city" "text", "lat" double precision, "lng" double precision)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.identity_id,
    ip.display_name,
    ip.slug,
    ip.country,
    ip.city,
    ip.lat,
    ip.lng
  from profiles p
  join identity_profiles ip
    on ip.identity_id = p.active_identity_id
  where p.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_active_identity_profile_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_admin_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select au.role
  from admin_users au
  where au.user_id = auth.uid()
    and au.is_active = true
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_identities"() RETURNS TABLE("id" "uuid", "type" "text", "display_name" "text", "avatar_url" "text", "business_account_id" "uuid", "role" "text", "is_active" boolean, "slug" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    i.id,
    i.type,
    i.display_name,
    i.avatar_url,
    i.business_account_id,
    null::text as role,
    true as is_active,
    ip.slug
  from identities i
  left join identity_profiles ip
    on ip.identity_id = i.id
  where i.type = 'private'
    and i.user_id = auth.uid()
    and i.status = 'active'

  union all

  select
    i.id,
    i.type,
    i.display_name,
    i.avatar_url,
    i.business_account_id,
    bm.role,
    true as is_active,
    ip.slug
  from identities i
  join business_members bm
    on bm.business_account_id = i.business_account_id
  left join identity_profiles ip
    on ip.identity_id = i.id
  where i.type = 'business'
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and i.status = 'active';
$$;


ALTER FUNCTION "public"."get_my_identities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_identity_listings"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0, "status_filter" "text" DEFAULT 'all'::"text", "search_query" "text" DEFAULT ''::"text", "store_category_filter" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" bigint, "user_id" "uuid", "identity_id" "uuid", "created_at" timestamp with time zone, "title" "text", "description" "text", "price" "text", "image" "text", "status" "text", "active_until" timestamp with time zone, "category" "text", "subcategory" "text", "details" "jsonb", "condition" "text", "country" "text", "city" "text", "location" "text", "search_text" "text", "manufacturer" "text", "part_number" "text", "oem_number" "text", "vehicle_brand" "text", "vehicle_model" "text", "vehicle_year" "text", "engine" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
  with active_profile as (
    select profile.active_identity_id
    from public.profiles profile
    where profile.id = auth.uid()
      and public.current_user_has_identity_access(
        profile.active_identity_id
      )
  ),
  selected_category_scope as (
    select scope.category_id
    from active_profile profile
    cross join lateral public.get_store_category_scope_ids(
      profile.active_identity_id,
      store_category_filter
    ) scope
    where store_category_filter is not null
  )
  select
    listing.id,
    listing.user_id,
    listing.identity_id,
    listing.created_at,
    listing.title,
    listing.description,
    listing.price,
    listing.image,
    listing.status,
    listing.active_until,
    listing.category,
    listing.subcategory,
    listing.details,
    listing.condition,
    listing.country,
    listing.city,
    listing.location,
    listing.search_text,
    listing.manufacturer,
    listing.part_number,
    listing.oem_number,
    listing.vehicle_brand,
    listing.vehicle_model,
    listing.vehicle_year,
    listing.engine
  from active_profile profile
  join public.listings listing
    on listing.identity_id = profile.active_identity_id
  where (
    status_filter = 'all'
    or listing.status = status_filter
  )
  and (
    coalesce(search_query, '') = ''
    or listing.search_vector @@ websearch_to_tsquery(
      'simple',
      search_query
    )
    or listing.search_text ilike '%' || search_query || '%'
    or listing.title ilike '%' || search_query || '%'
    or listing.description ilike '%' || search_query || '%'
  )
  and (
    store_category_filter is null
    or exists (
      select 1
      from public.listing_store_categories listing_category
      join selected_category_scope scope
        on scope.category_id =
          listing_category.store_category_id
      where listing_category.listing_id = listing.id
    )
  )
  order by listing.created_at desc
  limit result_limit
  offset result_offset;
$$;


ALTER FUNCTION "public"."get_my_identity_listings"("result_limit" integer, "result_offset" integer, "status_filter" "text", "search_query" "text", "store_category_filter" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_identity_listings"("result_limit" integer, "result_offset" integer, "status_filter" "text", "search_query" "text", "store_category_filter" "uuid") IS 'Returns active-identity owner listings. Store category filtering includes the selected category and all descendants.';



CREATE OR REPLACE FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") RETURNS TABLE("identity_profile_id" "uuid", "identity_id" "uuid", "identity_type" "text", "business_account_id" "uuid", "display_name" "text", "slug" "text", "bio" "text", "avatar_url" "text", "banner_url" "text", "banner_dominant_color" "text", "contact_phone" "text", "contact_email" "text", "website_url" "text", "address_text" "text", "city" "text", "country" "text", "lat" double precision, "lng" double precision, "location_visibility" "text", "legacy_user_id" "uuid", "is_premium" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.id,
    i.id,
    i.type,
    i.business_account_id,
    ip.display_name,
    ip.slug,
    coalesce(ip.bio, p.bio),
    coalesce(ip.avatar_url, p.avatar_url),
    coalesce(ip.banner_url, p.banner_url),
    coalesce(ip.banner_dominant_color, p.banner_dominant_color),
    ip.contact_phone,
    ip.contact_email,
    ip.website_url,
    ip.address_text,
    ip.city,
    ip.country,
    ip.lat,
    ip.lng,
    ip.location_visibility,
    i.user_id,
    coalesce(p.is_premium, false)
  from identity_profiles ip
  join identities i on i.id = ip.identity_id
  left join profiles p on p.id = i.user_id
  where ip.slug = store_slug_input
     or p.store_slug = store_slug_input
  order by case when ip.slug = store_slug_input then 0 else 1 end
  limit 1;
$$;


ALTER FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") RETURNS TABLE("category_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with recursive category_scope (
    category_id,
    visited_ids
  ) as (
    /*
     * Scope always starts from the selected category.
     * The selected category must belong to the supplied identity.
     */
    select
      category.id,
      array[category.id]::uuid[]
    from public.store_categories category
    where category.id = p_category_id
      and category.identity_id = p_identity_id

    union all

    /*
     * Include every descendant.
     * The path guard prevents accidental recursive cycles.
     */
    select
      child.id,
      scope.visited_ids || child.id
    from public.store_categories child
    join category_scope scope
      on child.parent_id = scope.category_id
    where child.identity_id = p_identity_id
      and not child.id = any(scope.visited_ids)
  )
  select scope.category_id
  from category_scope scope;
$$;


ALTER FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") IS 'Internal recursive helper. Returns the selected store category and all descendants belonging to the supplied identity.';



CREATE OR REPLACE FUNCTION "public"."get_store_follow_state_identity"("p_store_identity_id" "uuid") RETURNS TABLE("is_following" boolean, "followers_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with me as (
    select active_identity_id
    from profiles
    where id = auth.uid()
    limit 1
  )
  select
    exists (
      select 1
      from store_follows sf, me
      where sf.follower_identity_id = me.active_identity_id
        and sf.store_identity_id = p_store_identity_id
    ) as is_following,
    (
      select count(*)
      from store_follows sf
      where sf.store_identity_id = p_store_identity_id
    ) as followers_count;
$$;


ALTER FUNCTION "public"."get_store_follow_state_identity"("p_store_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_follow_state_identity"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") RETURNS TABLE("is_following" boolean, "followers_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    exists (
      select 1
      from store_follows sf
      where sf.follower_identity_id = p_follower_identity_id
        and sf.store_identity_id = p_store_identity_id
    ) as is_following,
    (
      select count(*)
      from store_follows sf
      where sf.store_identity_id = p_store_identity_id
    ) as followers_count;
$$;


ALTER FUNCTION "public"."get_store_follow_state_identity"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_listings"("store_identity_id" "uuid", "viewer_user_id" "uuid" DEFAULT NULL::"uuid", "search_query" "text" DEFAULT ''::"text", "include_inactive" boolean DEFAULT false, "result_limit" integer DEFAULT 60) RETURNS TABLE("id" bigint, "title" "text", "description" "text", "price" "text", "image" "text", "status" "text", "active_until" timestamp with time zone, "category" "text", "condition" "text", "country" "text", "city" "text", "subcategory" "text", "search_text" "text", "details" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    l.id,
    l.title,
    l.description,
    l.price,
    l.image,
    l.status,
    l.active_until,
    l.category,
    l.condition,
    l.country,
    l.city,
    l.subcategory,
    l.search_text,
    l.details,
    l.created_at
  from listings l
  where l.identity_id = store_identity_id
    and (
      include_inactive = true
      or (
        l.status = 'active'
        and (
          l.active_until is null
          or l.active_until > now()
        )
      )
    )
    and (
      coalesce(trim(search_query), '') = ''
      or l.search_text ilike '%' || search_query || '%'
      or l.title ilike '%' || search_query || '%'
      or l.description ilike '%' || search_query || '%'
    )
  order by l.created_at desc
  limit result_limit;
$$;


ALTER FUNCTION "public"."get_store_listings"("store_identity_id" "uuid", "viewer_user_id" "uuid", "search_query" "text", "include_inactive" boolean, "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_business_member"("business_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from business_members
    where business_account_id = business_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_business_member"("business_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prepare_store_category_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.name := regexp_replace(
    btrim(coalesce(new.name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if char_length(new.name) = 0 then
    raise exception
      'Store category name cannot be empty.'
      using errcode = '23514';
  end if;

  if char_length(new.name) > 60 then
    raise exception
      'Store category name cannot be longer than 60 characters.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."prepare_store_category_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") RETURNS TABLE("id" "uuid", "name" "text", "sort_order" integer, "parent_id" "uuid", "identity_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
  v_clean_name text;

  v_original_parent_id uuid;
  v_updated_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_category_id is null then
    raise exception
      'Store category is required.'
      using errcode = '22023';
  end if;

  v_clean_name := regexp_replace(
    btrim(coalesce(p_name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if char_length(v_clean_name) = 0 then
    raise exception
      'Store category name cannot be empty.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_name) > 60 then
    raise exception
      'Store category name cannot be longer than 60 characters.'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock and verify the selected category.
   *
   * Only a category belonging to the current active identity
   * can be renamed.
   */
  select category.parent_id
  into v_original_parent_id
  from public.store_categories category
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id
  for update;

  if not found then
    raise exception
      'The store category does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Rename only.
   *
   * parent_id, identity_id, user_id and sort_order remain unchanged.
   * Existing database triggers normalize and validate the name.
   * Existing unique indexes protect sibling-name uniqueness.
   */
  update public.store_categories as category
  set name = v_clean_name
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id
  returning category.*
  into v_updated_category;

  if v_updated_category.parent_id is distinct from v_original_parent_id then
    raise exception
      'Store category parent changed unexpectedly.'
      using errcode = '23514';
  end if;

  return query
  select
    v_updated_category.id,
    v_updated_category.name,
    v_updated_category.sort_order,
    v_updated_category.parent_id,
    v_updated_category.identity_id;

exception
  when unique_violation then
    raise exception
      'A sibling store category with this name already exists.'
      using errcode = '23505';
end;
$$;


ALTER FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") IS 'Renames a root or child store category belonging to the authenticated user active identity. Hierarchy position remains unchanged.';



CREATE OR REPLACE FUNCTION "public"."require_my_active_identity_v2"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  return v_active_identity_id;
end;
$$;


ALTER FUNCTION "public"."require_my_active_identity_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."require_my_active_identity_v2"() IS 'Internal authorization guard returning the authenticated user accessible active identity.';



CREATE OR REPLACE FUNCTION "public"."restore_conversation_for_participants"("target_conversation_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from conversation_participants
    where conversation_id = target_conversation_id
      and user_id = auth.uid()
  ) then
    raise exception 'Not allowed';
  end if;

  update conversation_participants
  set deleted_at = null
  where conversation_id = target_conversation_id;
end;
$$;


ALTER FUNCTION "public"."restore_conversation_for_participants"("target_conversation_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_active_identity_profile"("p_display_name" "text", "p_slug" "text", "p_bio" "text", "p_avatar_url" "text", "p_banner_url" "text", "p_banner_dominant_color" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_identity_id uuid;
begin
  select active_identity_id
  into v_identity_id
  from profiles
  where id = v_user_id;

  if v_user_id is null or v_identity_id is null then
    raise exception 'No active identity found';
  end if;

  update identity_profiles
  set
    display_name = p_display_name,
    slug = p_slug,
    bio = nullif(p_bio, ''),
    avatar_url = nullif(p_avatar_url, ''),
    banner_url = nullif(p_banner_url, ''),
    banner_dominant_color = nullif(p_banner_dominant_color, ''),
    updated_by_user_id = v_user_id,
    updated_at = now()
  where identity_id = v_identity_id;

  if not found then
    insert into identity_profiles (
      identity_id,
      display_name,
      slug,
      bio,
      avatar_url,
      banner_url,
      banner_dominant_color,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_identity_id,
      p_display_name,
      p_slug,
      nullif(p_bio, ''),
      nullif(p_avatar_url, ''),
      nullif(p_banner_url, ''),
      nullif(p_banner_dominant_color, ''),
      v_user_id,
      v_user_id
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."save_my_active_identity_profile"("p_display_name" "text", "p_slug" "text", "p_bio" "text", "p_avatar_url" "text", "p_banner_url" "text", "p_banner_dominant_color" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."product_showcases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text",
    "image_url" "text",
    "external_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_showcases_category_length_check" CHECK ((("category" IS NULL) OR (("char_length"(TRIM(BOTH FROM "category")) >= 1) AND ("char_length"(TRIM(BOTH FROM "category")) <= 120)))),
    CONSTRAINT "product_showcases_description_length_check" CHECK (("char_length"("description") <= 5000)),
    CONSTRAINT "product_showcases_external_url_length_check" CHECK ((("external_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "external_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "external_url")) <= 2000)))),
    CONSTRAINT "product_showcases_image_url_length_check" CHECK ((("image_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "image_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "image_url")) <= 2000)))),
    CONSTRAINT "product_showcases_published_at_check" CHECK ((("status" <> 'published'::"text") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "product_showcases_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "product_showcases_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "product_showcases_title_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 2) AND ("char_length"(TRIM(BOTH FROM "title")) <= 140)))
);


ALTER TABLE "public"."product_showcases" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_showcases" IS 'Identity-owned public profile product examples and portfolio items that are not marketplace listings.';



COMMENT ON COLUMN "public"."product_showcases"."external_url" IS 'Optional external or future internal detail link.';



COMMENT ON COLUMN "public"."product_showcases"."status" IS 'Draft is owner-only, published is public, archived is owner-only.';



CREATE OR REPLACE FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT ''::"text", "p_category" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_external_url" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."product_showcases"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_title text :=
    regexp_replace(
      btrim(coalesce(p_title, '')),
      '[[:space:]]+',
      ' ',
      'g'
    );

  v_description text :=
    btrim(
      coalesce(p_description, '')
    );

  v_category text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_category, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_image_url text :=
    nullif(
      btrim(coalesce(p_image_url, '')),
      ''
    );

  v_external_url text :=
    nullif(
      btrim(coalesce(p_external_url, '')),
      ''
    );

  v_next_sort_order integer;
  v_showcase public.product_showcases%rowtype;
begin
  if char_length(v_title) < 2 then
    raise exception
      'Product showcase title must contain at least 2 characters.'
      using errcode = '22023';
  end if;

  if char_length(v_title) > 140 then
    raise exception
      'Product showcase title cannot be longer than 140 characters.'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 5000 then
    raise exception
      'Product showcase description cannot be longer than 5000 characters.'
      using errcode = '22023';
  end if;

  if (
    v_category is not null
    and char_length(v_category) > 120
  ) then
    raise exception
      'Product showcase category cannot be longer than 120 characters.'
      using errcode = '22023';
  end if;

  if (
    v_image_url is not null
    and char_length(v_image_url) > 2000
  ) then
    raise exception
      'Product showcase image URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if (
    v_external_url is not null
    and char_length(v_external_url) > 2000
  ) then
    raise exception
      'Product showcase external URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if p_showcase_id is null then
    select
      coalesce(
        max(showcase.sort_order),
        -1
      ) + 1
    into v_next_sort_order
    from public.product_showcases showcase
    where showcase.identity_id =
      v_active_identity_id;

    insert into public.product_showcases (
      identity_id,
      title,
      description,
      category,
      image_url,
      external_url,
      status,
      sort_order
    )
    values (
      v_active_identity_id,
      v_title,
      v_description,
      v_category,
      v_image_url,
      v_external_url,
      'draft',
      v_next_sort_order
    )
    returning *
    into v_showcase;
  else
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

    update public.product_showcases showcase
    set
      title = v_title,
      description = v_description,
      category = v_category,
      image_url = v_image_url,
      external_url = v_external_url
    where showcase.id = p_showcase_id
      and showcase.identity_id =
          v_active_identity_id
    returning *
    into v_showcase;
  end if;

  return next v_showcase;
  return;
end;
$$;


ALTER FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_image_url" "text", "p_external_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_image_url" "text", "p_external_url" "text") IS 'Creates a draft product showcase when ID is null or updates an item belonging to the authenticated user active identity.';



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text",
    "subcategory" "text",
    "image_url" "text",
    "price_amount" numeric(12,2),
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "price_type" "text" DEFAULT 'contact'::"text" NOT NULL,
    "country" "text",
    "city" "text",
    "location" "text",
    "service_lat" double precision,
    "service_lng" double precision,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "services_category_length_check" CHECK ((("category" IS NULL) OR (("char_length"(TRIM(BOTH FROM "category")) >= 1) AND ("char_length"(TRIM(BOTH FROM "category")) <= 120)))),
    CONSTRAINT "services_city_length_check" CHECK ((("city" IS NULL) OR (("char_length"(TRIM(BOTH FROM "city")) >= 1) AND ("char_length"(TRIM(BOTH FROM "city")) <= 160)))),
    CONSTRAINT "services_coordinate_pair_check" CHECK (((("service_lat" IS NULL) AND ("service_lng" IS NULL)) OR (("service_lat" IS NOT NULL) AND ("service_lng" IS NOT NULL)))),
    CONSTRAINT "services_country_length_check" CHECK ((("country" IS NULL) OR (("char_length"(TRIM(BOTH FROM "country")) >= 1) AND ("char_length"(TRIM(BOTH FROM "country")) <= 120)))),
    CONSTRAINT "services_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "services_description_length_check" CHECK (("char_length"("description") <= 5000)),
    CONSTRAINT "services_image_url_length_check" CHECK ((("image_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "image_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "image_url")) <= 2000)))),
    CONSTRAINT "services_latitude_check" CHECK ((("service_lat" IS NULL) OR (("service_lat" >= ('-90'::integer)::double precision) AND ("service_lat" <= (90)::double precision)))),
    CONSTRAINT "services_location_length_check" CHECK ((("location" IS NULL) OR (("char_length"(TRIM(BOTH FROM "location")) >= 1) AND ("char_length"(TRIM(BOTH FROM "location")) <= 300)))),
    CONSTRAINT "services_longitude_check" CHECK ((("service_lng" IS NULL) OR (("service_lng" >= ('-180'::integer)::double precision) AND ("service_lng" <= (180)::double precision)))),
    CONSTRAINT "services_price_amount_check" CHECK ((("price_amount" IS NULL) OR ("price_amount" >= (0)::numeric))),
    CONSTRAINT "services_price_type_check" CHECK (("price_type" = ANY (ARRAY['fixed'::"text", 'from'::"text", 'hourly'::"text", 'contact'::"text"]))),
    CONSTRAINT "services_published_at_check" CHECK ((("status" <> 'published'::"text") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "services_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "services_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "services_subcategory_length_check" CHECK ((("subcategory" IS NULL) OR (("char_length"(TRIM(BOTH FROM "subcategory")) >= 1) AND ("char_length"(TRIM(BOTH FROM "subcategory")) <= 160)))),
    CONSTRAINT "services_title_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 2) AND ("char_length"(TRIM(BOTH FROM "title")) <= 140)))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON TABLE "public"."services" IS 'Identity-owned services displayed in My Area, public profiles and service discovery.';



COMMENT ON COLUMN "public"."services"."price_amount" IS 'Optional service price. Null means no public numeric price is shown.';



COMMENT ON COLUMN "public"."services"."price_type" IS 'Price presentation: fixed, from, hourly or contact.';



COMMENT ON COLUMN "public"."services"."status" IS 'Draft is owner-only, published is public, archived is owner-only.';



CREATE OR REPLACE FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT ''::"text", "p_category" "text" DEFAULT NULL::"text", "p_subcategory" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_price_amount" numeric DEFAULT NULL::numeric, "p_currency" "text" DEFAULT 'EUR'::"text", "p_price_type" "text" DEFAULT 'contact'::"text", "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_location" "text" DEFAULT NULL::"text", "p_service_lat" double precision DEFAULT NULL::double precision, "p_service_lng" double precision DEFAULT NULL::double precision) RETURNS SETOF "public"."services"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $_$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_title text :=
    regexp_replace(
      btrim(coalesce(p_title, '')),
      '[[:space:]]+',
      ' ',
      'g'
    );

  v_description text :=
    btrim(coalesce(p_description, ''));

  v_category text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_category, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_subcategory text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_subcategory, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_image_url text :=
    nullif(
      btrim(coalesce(p_image_url, '')),
      ''
    );

  v_currency text :=
    upper(
      btrim(
        coalesce(p_currency, 'EUR')
      )
    );

  v_price_type text :=
    lower(
      btrim(
        coalesce(p_price_type, 'contact')
      )
    );

  v_price_amount numeric :=
    p_price_amount;

  v_country text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_country, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_city text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_city, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_location text :=
    nullif(
      regexp_replace(
        btrim(coalesce(p_location, '')),
        '[[:space:]]+',
        ' ',
        'g'
      ),
      ''
    );

  v_next_sort_order integer;
  v_service public.services%rowtype;
begin
  if char_length(v_title) < 2 then
    raise exception
      'Service title must contain at least 2 characters.'
      using errcode = '22023';
  end if;

  if char_length(v_title) > 140 then
    raise exception
      'Service title cannot be longer than 140 characters.'
      using errcode = '22023';
  end if;

  if char_length(v_description) > 5000 then
    raise exception
      'Service description cannot be longer than 5000 characters.'
      using errcode = '22023';
  end if;

  if (
    v_category is not null
    and char_length(v_category) > 120
  ) then
    raise exception
      'Service category cannot be longer than 120 characters.'
      using errcode = '22023';
  end if;

  if (
    v_subcategory is not null
    and char_length(v_subcategory) > 160
  ) then
    raise exception
      'Service subcategory cannot be longer than 160 characters.'
      using errcode = '22023';
  end if;

  if (
    v_image_url is not null
    and char_length(v_image_url) > 2000
  ) then
    raise exception
      'Service image URL cannot be longer than 2000 characters.'
      using errcode = '22023';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception
      'Service currency must be a three-letter uppercase code.'
      using errcode = '22023';
  end if;

  if v_price_type not in (
    'fixed',
    'from',
    'hourly',
    'contact'
  ) then
    raise exception
      'Service price type is invalid.'
      using errcode = '22023';
  end if;

  if (
    v_price_amount is not null
    and v_price_amount < 0
  ) then
    raise exception
      'Service price cannot be negative.'
      using errcode = '22023';
  end if;

  if (
    v_price_amount is not null
    and v_price_amount > 9999999999.99
  ) then
    raise exception
      'Service price is too large.'
      using errcode = '22023';
  end if;

  if v_price_type = 'contact' then
    v_price_amount := null;
  elsif v_price_amount is null then
    raise exception
      'A numeric price is required for this service price type.'
      using errcode = '22023';
  end if;

  if (
    v_country is not null
    and char_length(v_country) > 120
  ) then
    raise exception
      'Service country cannot be longer than 120 characters.'
      using errcode = '22023';
  end if;

  if (
    v_city is not null
    and char_length(v_city) > 160
  ) then
    raise exception
      'Service city cannot be longer than 160 characters.'
      using errcode = '22023';
  end if;

  if v_location is null then
    v_location :=
      nullif(
        concat_ws(
          ' • ',
          v_city,
          v_country
        ),
        ''
      );
  end if;

  if (
    v_location is not null
    and char_length(v_location) > 300
  ) then
    raise exception
      'Service location cannot be longer than 300 characters.'
      using errcode = '22023';
  end if;

  if (
    p_service_lat is null
  ) <> (
    p_service_lng is null
  ) then
    raise exception
      'Service latitude and longitude must be supplied together.'
      using errcode = '22023';
  end if;

  if (
    p_service_lat is not null
    and (
      p_service_lat < -90
      or p_service_lat > 90
    )
  ) then
    raise exception
      'Service latitude is invalid.'
      using errcode = '22023';
  end if;

  if (
    p_service_lng is not null
    and (
      p_service_lng < -180
      or p_service_lng > 180
    )
  ) then
    raise exception
      'Service longitude is invalid.'
      using errcode = '22023';
  end if;

  if p_service_id is null then
    select
      coalesce(
        max(service.sort_order),
        -1
      ) + 1
    into v_next_sort_order
    from public.services service
    where service.identity_id =
      v_active_identity_id;

    insert into public.services (
      identity_id,
      title,
      description,
      category,
      subcategory,
      image_url,
      price_amount,
      currency,
      price_type,
      country,
      city,
      location,
      service_lat,
      service_lng,
      status,
      sort_order
    )
    values (
      v_active_identity_id,
      v_title,
      v_description,
      v_category,
      v_subcategory,
      v_image_url,
      v_price_amount,
      v_currency,
      v_price_type,
      v_country,
      v_city,
      v_location,
      p_service_lat,
      p_service_lng,
      'draft',
      v_next_sort_order
    )
    returning *
    into v_service;
  else
    select service.*
    into v_service
    from public.services service
    where service.id = p_service_id
      and service.identity_id =
          v_active_identity_id
    for update;

    if not found then
      raise exception
        'The service does not exist or does not belong to the active identity.'
        using errcode = '42501';
    end if;

    update public.services service
    set
      title = v_title,
      description = v_description,
      category = v_category,
      subcategory = v_subcategory,
      image_url = v_image_url,
      price_amount = v_price_amount,
      currency = v_currency,
      price_type = v_price_type,
      country = v_country,
      city = v_city,
      location = v_location,
      service_lat = p_service_lat,
      service_lng = p_service_lng
    where service.id = p_service_id
      and service.identity_id =
          v_active_identity_id
    returning *
    into v_service;
  end if;

  return next v_service;
  return;
end;
$_$;


ALTER FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_subcategory" "text", "p_image_url" "text", "p_price_amount" numeric, "p_currency" "text", "p_price_type" "text", "p_country" "text", "p_city" "text", "p_location" "text", "p_service_lat" double precision, "p_service_lng" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_subcategory" "text", "p_image_url" "text", "p_price_amount" numeric, "p_currency" "text", "p_price_type" "text", "p_country" "text", "p_city" "text", "p_location" "text", "p_service_lat" double precision, "p_service_lng" double precision) IS 'Creates a draft service when ID is null or updates editable fields on a service belonging to the authenticated user active identity.';



CREATE OR REPLACE FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") RETURNS TABLE("identity_id" "uuid", "identity_type" "text", "display_name" "text", "avatar_url" "text", "slug" "text", "changed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();

  v_previous_identity_id uuid;
  v_identity_type text;
  v_display_name text;
  v_avatar_url text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_identity_id is null then
    raise exception
      'Identity ID is required.'
      using errcode = '22023';
  end if;

  /*
   * The target must be an existing active identity.
   */
  select
    i.type::text,
    i.display_name,
    i.avatar_url,
    ip.slug
  into
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug
  from public.identities i
  left join public.identity_profiles ip
    on ip.identity_id = i.id
  where i.id = p_identity_id
    and i.status = 'active';

  if not found then
    raise exception
      'The selected identity does not exist or is inactive.'
      using errcode = '22023';
  end if;

  /*
   * Private ownership or active business membership
   * must be valid for the authenticated user.
   */
  if not coalesce(
    public.current_user_has_identity_access(
      p_identity_id
    ),
    false
  ) then
    raise exception
      'The selected identity is not accessible to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock the user's profile so concurrent switches are
   * serialized.
   */
  select profile.active_identity_id
  into v_previous_identity_id
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception
      'The authenticated user profile does not exist.'
      using errcode = '22023';
  end if;

  if v_previous_identity_id
    is distinct from p_identity_id
  then
    update public.profiles
    set active_identity_id = p_identity_id
    where id = v_user_id;
  end if;

  return query
  select
    p_identity_id,
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug,
    (
      v_previous_identity_id
      is distinct from p_identity_id
    );
end;
$$;


ALTER FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") IS 'Securely switches the authenticated user active identity after validating private ownership or active business membership. Returns the selected identity summary.';



CREATE OR REPLACE FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS TABLE("listing_id" bigint, "category_ids" "uuid"[], "assigned_count" integer, "removed_previous_links" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $_$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_listing_id bigint;
  v_listing_identity_id uuid;

  v_normalized_category_ids uuid[] := '{}'::uuid[];
  v_requested_count integer := 0;
  v_valid_count integer := 0;
  v_removed_count integer := 0;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  /*
   * Listing IDs arrive from the browser as strings.
   * Accept only a positive numeric database ID.
   */
  if btrim(coalesce(p_listing_id, '')) !~ '^[0-9]+$' then
    raise exception
      'A valid listing ID is required.'
      using errcode = '22023';
  end if;

  v_listing_id := btrim(p_listing_id)::bigint;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

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

  /*
   * Lock and verify the listing.
   *
   * Store categories are identity-owned, therefore V2 assignment
   * requires identity_id ownership. A legacy user_id-only listing
   * must first be migrated to identity ownership.
   */
  select listing.identity_id
  into v_listing_identity_id
  from public.listings listing
  where listing.id = v_listing_id
  for update;

  if not found then
    raise exception
      'The listing does not exist.'
      using errcode = '22023';
  end if;

  if v_listing_identity_id is null
    or v_listing_identity_id <> v_active_identity_id
  then
    raise exception
      'The listing does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Normalize the requested set:
   *
   * - NULL input becomes an empty array
   * - NULL category IDs are discarded
   * - duplicate IDs are removed
   * - deterministic ordering is used in the returned value
   */
  select coalesce(
    array_agg(
      distinct requested.category_id
      order by requested.category_id
    ),
    '{}'::uuid[]
  )
  into v_normalized_category_ids
  from unnest(
    coalesce(p_category_ids, '{}'::uuid[])
  ) as requested(category_id)
  where requested.category_id is not null;

  v_requested_count :=
    coalesce(cardinality(v_normalized_category_ids), 0);

  /*
   * Every selected category must belong to the same active identity.
   * A foreign, missing or stale category ID rejects the whole update.
   */
  if v_requested_count > 0 then
    select count(*)::integer
    into v_valid_count
    from public.store_categories category
    where category.identity_id = v_active_identity_id
      and category.id = any(v_normalized_category_ids);

    if v_valid_count <> v_requested_count then
      raise exception
        'One or more store categories do not belong to the active identity.'
        using errcode = '42501';
    end if;
  end if;

  /*
   * Replace the complete explicit assignment set atomically.
   *
   * If validation or insertion fails, PostgreSQL rolls the entire
   * function call back, including this deletion.
   */
  with deleted_links as (
    delete from public.listing_store_categories relation
    where relation.listing_id = v_listing_id
    returning 1
  )
  select count(*)::integer
  into v_removed_count
  from deleted_links;

  if v_requested_count > 0 then
    insert into public.listing_store_categories (
      listing_id,
      store_category_id
    )
    select
      v_listing_id,
      selected_category.category_id
    from unnest(
      v_normalized_category_ids
    ) as selected_category(category_id);
  end if;

  return query
  select
    v_listing_id,
    v_normalized_category_ids,
    v_requested_count,
    v_removed_count;
end;
$_$;


ALTER FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[]) IS 'Atomically replaces explicit store-category links for a listing belonging to the authenticated user active identity. Empty array removes all links. Parent links are not added automatically.';



CREATE OR REPLACE FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") RETURNS SETOF "public"."product_showcases"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_status text :=
    lower(
      btrim(
        coalesce(p_status, '')
      )
    );

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

  update public.product_showcases showcase
  set
    status = v_status,
    published_at =
      case
        when v_status = 'published'
          then coalesce(
            showcase.published_at,
            now()
          )
        else showcase.published_at
      end
  where showcase.id = p_showcase_id
    and showcase.identity_id =
        v_active_identity_id
  returning *
  into v_showcase;

  return next v_showcase;
  return;
end;
$$;


ALTER FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") IS 'Changes an active-identity product showcase status to draft, published or archived.';



CREATE OR REPLACE FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") RETURNS SETOF "public"."services"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_status text :=
    lower(
      btrim(
        coalesce(p_status, '')
      )
    );

  v_service public.services%rowtype;
begin
  if p_service_id is null then
    raise exception
      'Service ID is required.'
      using errcode = '22023';
  end if;

  if v_status not in (
    'draft',
    'published',
    'archived'
  ) then
    raise exception
      'Service status is invalid.'
      using errcode = '22023';
  end if;

  select service.*
  into v_service
  from public.services service
  where service.id = p_service_id
    and service.identity_id =
        v_active_identity_id
  for update;

  if not found then
    raise exception
      'The service does not exist or does not belong to the active identity.'
      using errcode = '42501';
  end if;

  update public.services service
  set
    status = v_status,
    published_at =
      case
        when v_status = 'published'
          then coalesce(
            service.published_at,
            now()
          )
        else service.published_at
      end
  where service.id = p_service_id
    and service.identity_id =
        v_active_identity_id
  returning *
  into v_service;

  return next v_service;
  return;
end;
$$;


ALTER FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") IS 'Changes an active-identity service status to draft, published or archived.';



CREATE OR REPLACE FUNCTION "public"."set_v2_profile_content_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_v2_profile_content_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_identity_report"("p_reported_identity_id" "uuid", "p_reason" "text", "p_details" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_reporter_id uuid := auth.uid();
  v_reported_profile_id uuid;
  v_report_id bigint;
begin
  select p.id
  into v_reported_profile_id
  from identity_profiles ip
  join profiles p
    on p.id = ip.created_by_user_id
  where ip.identity_id = p_reported_identity_id
  limit 1;

  if v_reporter_id is null or v_reported_profile_id is null then
    raise exception 'missing report data';
  end if;

  if v_reporter_id = v_reported_profile_id then
    raise exception 'cannot report own account';
  end if;

  insert into reports (
    reporter_id,
    reported_user_id,
    report_type,
    reason,
    details,
    status
  )
  values (
    v_reporter_id,
    v_reported_profile_id,
    'user',
    p_reason,
    nullif(trim(coalesce(p_details, '')), ''),
    'open'
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;


ALTER FUNCTION "public"."submit_identity_report"("p_reported_identity_id" "uuid", "p_reason" "text", "p_details" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_store_follow_identity"("p_store_identity_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_follower_identity_id uuid;
  v_store_owner_id uuid;
  v_exists boolean;
begin
  select active_identity_id
  into v_follower_identity_id
  from profiles
  where id = v_user_id;

  select created_by_user_id
  into v_store_owner_id
  from identity_profiles
  where identity_id = p_store_identity_id
  limit 1;

  if v_user_id is null or v_follower_identity_id is null or p_store_identity_id is null or v_store_owner_id is null then
    raise exception 'missing follow identity data';
  end if;

  if v_follower_identity_id = p_store_identity_id then
    raise exception 'cannot follow own store';
  end if;

  select exists (
    select 1
    from store_follows
    where follower_identity_id = v_follower_identity_id
      and store_identity_id = p_store_identity_id
  )
  into v_exists;

  if v_exists then
    delete from store_follows
    where follower_identity_id = v_follower_identity_id
      and store_identity_id = p_store_identity_id;

    return false;
  end if;

  insert into store_follows (
    follower_id,
    store_owner_id,
    follower_identity_id,
    store_identity_id
  )
  values (
    v_user_id,
    v_store_owner_id,
    v_follower_identity_id,
    p_store_identity_id
  );

  return true;
end;
$$;


ALTER FUNCTION "public"."toggle_store_follow_identity"("p_store_identity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_listing_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.search_vector :=
    to_tsvector(
      'simple',
      concat_ws(
        ' ',
        new.title,
        new.description,
        new.search_text,
        new.category,
        new.subcategory,
        new.condition,
        new.country,
        new.city,
        new.location,
        coalesce(new.details::text, '')
      )
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."update_listing_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_active_identity_location"("p_country" "text", "p_city" "text", "p_lat" double precision DEFAULT NULL::double precision, "p_lng" double precision DEFAULT NULL::double precision) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_identity_id uuid;
  v_updated_count integer;
begin
  select active_identity_id
  into v_identity_id
  from profiles
  where id = auth.uid();

  if v_identity_id is null then
    raise exception 'Active identity missing';
  end if;

  update identity_profiles
  set
    country = nullif(trim(p_country), ''),
    city = nullif(trim(p_city), ''),
    lat = p_lat,
    lng = p_lng
  where identity_id = v_identity_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'Identity profile row not found for %', v_identity_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."update_my_active_identity_location"("p_country" "text", "p_city" "text", "p_lat" double precision, "p_lng" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text" DEFAULT NULL::"text", "p_detail_category" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_listing_lat" double precision DEFAULT NULL::double precision, "p_listing_lng" double precision DEFAULT NULL::double precision) RETURNS TABLE("listing_id" bigint, "category" "text", "subcategory" "text", "detail_category" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "changed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text", "p_detail_category" "text", "p_country" "text", "p_city" "text", "p_listing_lat" double precision, "p_listing_lng" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text", "p_detail_category" "text", "p_country" "text", "p_city" "text", "p_listing_lat" double precision, "p_listing_lng" double precision) IS 'Updates Selqiro global classification and listing location for a listing owned by the authenticated user active identity. Preserves listing store-category links and all details except details.detailCategory.';



CREATE OR REPLACE FUNCTION "public"."validate_profile_active_identity_v2"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if new.active_identity_id
    is not distinct from old.active_identity_id
  then
    return new;
  end if;

  /*
   * SQL Editor, postgres and trusted backend jobs may
   * operate without an end-user JWT.
   *
   * Anonymous or authenticated JWT requests without a
   * user ID must never bypass the identity check.
   */
  if v_user_id is null then
    if v_jwt_role in ('anon', 'authenticated') then
      raise exception
        'Authentication is required to change active identity.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.id is distinct from v_user_id then
    raise exception
      'A user can change only their own active identity.'
      using errcode = '42501';
  end if;

  if new.active_identity_id is null then
    raise exception
      'Active identity cannot be empty.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      new.active_identity_id
    ),
    false
  ) then
    raise exception
      'The selected identity is not accessible to the authenticated user.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_profile_active_identity_v2"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_profile_active_identity_v2"() IS 'Validates authenticated direct changes to profiles.active_identity_id. The target identity must belong to the user or be accessible through active business membership.';



CREATE OR REPLACE FUNCTION "public"."validate_store_category_parent"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  parent_identity_id uuid;
  cycle_found boolean;
begin
  /*
   * Prevent changing a parent's identity while it still has children
   * belonging to the previous identity.
   */
  if tg_op = 'UPDATE' then
    if new.identity_id is distinct from old.identity_id
      and exists (
        select 1
        from public.store_categories child
        where child.parent_id = new.id
          and child.identity_id is distinct from new.identity_id
      )
    then
      raise exception
        'A store category identity cannot be changed while its children belong to another identity.'
        using errcode = '23514';
    end if;
  end if;

  /*
   * Root categories do not need parent validation.
   * Legacy root rows with identity_id null remain untouched.
   */
  if new.parent_id is null then
    return new;
  end if;

  if new.identity_id is null then
    raise exception
      'A child store category must belong to an identity.'
      using errcode = '23514';
  end if;

  if new.id = new.parent_id then
    raise exception
      'A store category cannot be its own parent.'
      using errcode = '23514';
  end if;

  select category.identity_id
  into parent_identity_id
  from public.store_categories category
  where category.id = new.parent_id;

  if not found then
    raise exception
      'The selected parent store category does not exist.'
      using errcode = '23503';
  end if;

  if parent_identity_id is null
    or new.identity_id is distinct from parent_identity_id
  then
    raise exception
      'Parent and child store categories must belong to the same identity.'
      using errcode = '23514';
  end if;

  /*
   * Walk upward from the proposed parent.
   * If the current row is found among its ancestors, the change
   * would create a cycle.
   */
  with recursive ancestors as (
    select
      category.id,
      category.parent_id,
      array[category.id]::uuid[] as visited_ids
    from public.store_categories category
    where category.id = new.parent_id

    union all

    select
      category.id,
      category.parent_id,
      ancestors.visited_ids || category.id
    from public.store_categories category
    join ancestors
      on category.id = ancestors.parent_id
    where not category.id = any(ancestors.visited_ids)
  )
  select exists (
    select 1
    from ancestors
    where id = new.id
  )
  into cycle_found;

  if cycle_found then
    raise exception
      'Store category hierarchy cannot contain a cycle.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_store_category_parent"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user_id" "uuid",
    "business_account_id" "uuid",
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "action" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" bigint NOT NULL,
    "admin_user_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."admin_audit_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."admin_audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'moderator'::"text", 'support'::"text", 'developer'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_category_corrections" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "listing_id" bigint,
    "ai_object" "text",
    "ai_suggested_title" "text",
    "ai_category" "text",
    "ai_subcategory" "text",
    "ai_detail_category" "text",
    "final_category" "text",
    "final_subcategory" "text",
    "final_detail_category" "text",
    "ai_confidence" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_category_corrections" OWNER TO "postgres";


ALTER TABLE "public"."ai_category_corrections" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ai_category_corrections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ai_usage_daily" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "usage_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "analyze_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage_daily" OWNER TO "postgres";


ALTER TABLE "public"."ai_usage_daily" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."ai_usage_daily_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ai_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "listing_id" bigint,
    "feature" "text" NOT NULL,
    "account_tier" "text" DEFAULT 'free'::"text",
    "credits_used" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_usage_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "verification_status" "text" DEFAULT 'unverified'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."city_geocache" (
    "id" bigint NOT NULL,
    "country" "text" NOT NULL,
    "city" "text" NOT NULL,
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."city_geocache" OWNER TO "postgres";


ALTER TABLE "public"."city_geocache" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."city_geocache_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" bigint NOT NULL,
    "conversation_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "custom_title" "text",
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "identity_id" "uuid"
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


ALTER TABLE "public"."conversation_participants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."conversation_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" bigint NOT NULL,
    "listing_id" bigint,
    "listing_title_snapshot" "text",
    "listing_image_snapshot" "text",
    "listing_price_snapshot" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "seller_id" "uuid",
    "buyer_id" "uuid",
    "archived_at" timestamp with time zone,
    "buyer_identity_id" "uuid",
    "seller_identity_id" "uuid"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


ALTER TABLE "public"."conversations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."conversations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."identities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "user_id" "uuid",
    "business_account_id" "uuid",
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "identities_type_check" CHECK (("type" = ANY (ARRAY['private'::"text", 'business'::"text"]))),
    CONSTRAINT "identity_owner_check" CHECK (((("type" = 'private'::"text") AND ("user_id" IS NOT NULL) AND ("business_account_id" IS NULL)) OR (("type" = 'business'::"text") AND ("business_account_id" IS NOT NULL))))
);


ALTER TABLE "public"."identities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."identity_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "slug" "text",
    "bio" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "banner_dominant_color" "text",
    "contact_phone" "text",
    "contact_email" "text",
    "website_url" "text",
    "address_text" "text",
    "city" "text",
    "country" "text",
    "lat" double precision,
    "lng" double precision,
    "location_visibility" "text" DEFAULT 'city'::"text" NOT NULL,
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text",
    CONSTRAINT "identity_profiles_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'premium'::"text", 'business'::"text"])))
);


ALTER TABLE "public"."identity_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_boosts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scope" "text" NOT NULL,
    "country_codes" "text"[] DEFAULT '{}'::"text"[],
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending_payment'::"text" NOT NULL,
    "price_amount" integer,
    "price_currency" "text" DEFAULT 'EUR'::"text",
    "payment_provider" "text",
    "payment_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "listing_boosts_scope_check" CHECK (("scope" = ANY (ARRAY['near_you'::"text", 'country'::"text", 'countries'::"text", 'global'::"text"]))),
    CONSTRAINT "listing_boosts_status_check" CHECK (("status" = ANY (ARRAY['pending_payment'::"text", 'active'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."listing_boosts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" bigint,
    "user_id" "uuid",
    "original_url" "text" NOT NULL,
    "medium_url" "text",
    "thumb_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."listing_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_store_categories" (
    "listing_id" bigint NOT NULL,
    "store_category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."listing_store_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listing_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" bigint NOT NULL,
    "language" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "ai_summary" "text",
    "source" "text" DEFAULT 'ai'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "translation_source" "text" DEFAULT 'ai'::"text",
    "is_machine_translated" boolean DEFAULT true
);


ALTER TABLE "public"."listing_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "price" "text",
    "image" "text",
    "status" "text" DEFAULT 'active'::"text",
    "category" "text" DEFAULT 'general'::"text",
    "condition" "text" DEFAULT 'used'::"text",
    "country" "text",
    "city" "text",
    "location" "text",
    "user_id" "uuid",
    "ai_title" "text",
    "ai_description" "text",
    "ai_category" "text",
    "ai_detected_brand" "text",
    "ai_detected_type" "text",
    "ai_confidence" double precision,
    "ai_raw" "jsonb",
    "manufacturer" "text",
    "part_number" "text",
    "oem_number" "text",
    "vehicle_brand" "text",
    "vehicle_model" "text",
    "vehicle_year" "text",
    "engine" "text",
    "compatibility" "jsonb",
    "is_featured" boolean DEFAULT false,
    "featured_until" timestamp with time zone,
    "ai_enriched" boolean DEFAULT false,
    "ai_level" "text" DEFAULT 'none'::"text",
    "item_type" "text",
    "subcategory" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_status" "text" DEFAULT 'not_started'::"text",
    "ai_review_required" boolean DEFAULT false,
    "ai_reviewed_by_user" boolean DEFAULT false,
    "search_text" "text",
    "active_until" timestamp with time zone,
    "is_boosted" boolean DEFAULT false,
    "boost_until" timestamp without time zone,
    "seo_title" "text",
    "seo_description" "text",
    "description_en" "text",
    "ai_detected_object" "text",
    "ai_suggested_category" "text",
    "ai_suggested_subcategory" "text",
    "ai_suggested_title" "text",
    "ai_suggested_brand" "text",
    "ai_suggested_model" "text",
    "ai_suggestion_json" "jsonb",
    "price_amount" numeric,
    "search_vector" "tsvector",
    "listing_lat" double precision,
    "listing_lng" double precision,
    "listing_language" "text" DEFAULT 'en'::"text",
    "identity_id" "uuid",
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid"
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


ALTER TABLE "public"."listings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."listings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."location_search_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "query" "text" NOT NULL,
    "country" "text",
    "provider" "text" DEFAULT 'nominatim'::"text" NOT NULL,
    "provider_place_id" "text",
    "display_name" "text" NOT NULL,
    "place_type" "text",
    "country_code" "text",
    "lat" double precision NOT NULL,
    "lng" double precision NOT NULL,
    "raw" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."location_search_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" bigint NOT NULL,
    "conversation_id" bigint NOT NULL,
    "sender_id" "uuid",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "listing_id" bigint,
    "listing_title" "text",
    "listing_image" "text",
    "listing_price" "text",
    "image_url" "text",
    "image_path" "text",
    "sender_identity_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


ALTER TABLE "public"."messages" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."premium_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_code" "text" NOT NULL,
    "created_by" "uuid",
    "claimed_by" "uuid",
    "premium_days" integer DEFAULT 30 NOT NULL,
    "max_uses" integer DEFAULT 1 NOT NULL,
    "uses_count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "premium_invites_check" CHECK ((("uses_count" >= 0) AND ("uses_count" <= "max_uses"))),
    CONSTRAINT "premium_invites_max_uses_check" CHECK (("max_uses" = 1)),
    CONSTRAINT "premium_invites_premium_days_check" CHECK (("premium_days" > 0))
);


ALTER TABLE "public"."premium_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "store_name" "text",
    "store_slug" "text",
    "bio" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_premium" boolean DEFAULT false NOT NULL,
    "premium_until" timestamp with time zone,
    "home_country" "text",
    "home_city" "text",
    "home_lat" double precision,
    "home_lng" double precision,
    "banner_dominant_color" "text",
    "avatar_dominant_color" "text",
    "language" "text" DEFAULT 'en'::"text",
    "active_identity_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" bigint NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid",
    "listing_id" bigint,
    "conversation_id" bigint,
    "report_type" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_report_type_check" CHECK (("report_type" = ANY (ARRAY['user'::"text", 'listing'::"text", 'conversation'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'reviewing'::"text", 'actioned'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reports_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reports_id_seq" OWNED BY "public"."reports"."id";



CREATE TABLE IF NOT EXISTS "public"."store_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    CONSTRAINT "store_categories_name_valid_check" CHECK (((("char_length"("name") >= 1) AND ("char_length"("name") <= 60)) AND ("name" = "regexp_replace"("btrim"("name"), '[[:space:]]+'::"text", ' '::"text", 'g'::"text"))))
);


ALTER TABLE "public"."store_categories" OWNER TO "postgres";


COMMENT ON COLUMN "public"."store_categories"."name" IS 'Owner-defined store category name. Normalized and limited to 60 characters. Unique among sibling categories within the same identity.';



COMMENT ON COLUMN "public"."store_categories"."parent_id" IS 'Optional parent store category. V2 UI supports two levels, while the database model allows deeper trees later.';



CREATE TABLE IF NOT EXISTS "public"."store_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "store_owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "follower_identity_id" "uuid",
    "store_identity_id" "uuid",
    CONSTRAINT "store_follows_check" CHECK (("follower_id" <> "store_owner_id"))
);


ALTER TABLE "public"."store_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" bigint NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_blocks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_blocks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_blocks_id_seq" OWNED BY "public"."user_blocks"."id";



CREATE TABLE IF NOT EXISTS "public"."user_trust_metrics" (
    "user_id" "uuid" NOT NULL,
    "report_count" integer DEFAULT 0 NOT NULL,
    "unique_reporter_count" integer DEFAULT 0 NOT NULL,
    "block_count" integer DEFAULT 0 NOT NULL,
    "trust_score" integer DEFAULT 50 NOT NULL,
    "risk_score" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone
);


ALTER TABLE "public"."user_trust_metrics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."reports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reports_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_blocks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_blocks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_category_corrections"
    ADD CONSTRAINT "ai_category_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_user_id_usage_date_key" UNIQUE ("user_id", "usage_date");



ALTER TABLE ONLY "public"."ai_usage_events"
    ADD CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_accounts"
    ADD CONSTRAINT "business_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_accounts"
    ADD CONSTRAINT "business_accounts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_business_account_id_user_id_key" UNIQUE ("business_account_id", "user_id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."city_geocache"
    ADD CONSTRAINT "city_geocache_country_city_key" UNIQUE ("country", "city");



ALTER TABLE ONLY "public"."city_geocache"
    ADD CONSTRAINT "city_geocache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_identity_id_key" UNIQUE ("identity_id");



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."listing_boosts"
    ADD CONSTRAINT "listing_boosts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_images"
    ADD CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listing_store_categories"
    ADD CONSTRAINT "listing_store_categories_pkey" PRIMARY KEY ("listing_id", "store_category_id");



ALTER TABLE ONLY "public"."listing_translations"
    ADD CONSTRAINT "listing_translations_listing_id_language_key" UNIQUE ("listing_id", "language");



ALTER TABLE ONLY "public"."listing_translations"
    ADD CONSTRAINT "listing_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_search_cache"
    ADD CONSTRAINT "location_search_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."premium_invites"
    ADD CONSTRAINT "premium_invites_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."premium_invites"
    ADD CONSTRAINT "premium_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_showcases"
    ADD CONSTRAINT "product_showcases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_store_slug_key" UNIQUE ("store_slug");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_categories"
    ADD CONSTRAINT "store_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_trust_metrics"
    ADD CONSTRAINT "user_trust_metrics_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "activity_log_actor_user_id_idx" ON "public"."activity_log" USING "btree" ("actor_user_id");



CREATE INDEX "activity_log_business_account_id_idx" ON "public"."activity_log" USING "btree" ("business_account_id");



CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "public"."admin_audit_logs" USING "btree" ("admin_user_id");



CREATE INDEX "admin_audit_logs_created_at_idx" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "admin_users_user_id_unique" ON "public"."admin_users" USING "btree" ("user_id");



CREATE INDEX "business_accounts_owner_user_id_idx" ON "public"."business_accounts" USING "btree" ("owner_user_id");



CREATE INDEX "business_members_business_account_id_idx" ON "public"."business_members" USING "btree" ("business_account_id");



CREATE INDEX "business_members_user_id_idx" ON "public"."business_members" USING "btree" ("user_id");



CREATE INDEX "conversation_participants_identity_id_idx" ON "public"."conversation_participants" USING "btree" ("identity_id");



CREATE INDEX "conversations_buyer_identity_id_idx" ON "public"."conversations" USING "btree" ("buyer_identity_id");



CREATE INDEX "conversations_seller_identity_id_idx" ON "public"."conversations" USING "btree" ("seller_identity_id");



CREATE INDEX "identities_business_account_id_idx" ON "public"."identities" USING "btree" ("business_account_id");



CREATE INDEX "identities_user_id_idx" ON "public"."identities" USING "btree" ("user_id");



CREATE INDEX "identity_profiles_city_country_idx" ON "public"."identity_profiles" USING "btree" ("city", "country");



CREATE INDEX "identity_profiles_identity_id_idx" ON "public"."identity_profiles" USING "btree" ("identity_id");



CREATE INDEX "identity_profiles_slug_idx" ON "public"."identity_profiles" USING "btree" ("slug");



CREATE INDEX "idx_ai_category_corrections_created_at" ON "public"."ai_category_corrections" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_category_corrections_final_path" ON "public"."ai_category_corrections" USING "btree" ("final_category", "final_subcategory", "final_detail_category");



CREATE INDEX "idx_city_geocache_country_city" ON "public"."city_geocache" USING "btree" ("country", "city");



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_buyer_seller" ON "public"."conversations" USING "btree" ("buyer_id", "seller_id");



CREATE INDEX "idx_listing_images_listing_id" ON "public"."listing_images" USING "btree" ("listing_id");



CREATE INDEX "idx_listing_store_categories_category" ON "public"."listing_store_categories" USING "btree" ("store_category_id");



CREATE INDEX "idx_listing_store_categories_category_id" ON "public"."listing_store_categories" USING "btree" ("store_category_id");



CREATE INDEX "idx_listing_store_categories_listing" ON "public"."listing_store_categories" USING "btree" ("listing_id");



CREATE INDEX "idx_listing_store_categories_listing_id" ON "public"."listing_store_categories" USING "btree" ("listing_id");



CREATE INDEX "idx_listings_active_until" ON "public"."listings" USING "btree" ("active_until");



CREATE INDEX "idx_listings_category" ON "public"."listings" USING "btree" ("category");



CREATE INDEX "idx_listings_city" ON "public"."listings" USING "btree" ("city");



CREATE INDEX "idx_listings_condition" ON "public"."listings" USING "btree" ("condition");



CREATE INDEX "idx_listings_coords" ON "public"."listings" USING "btree" ("listing_lat", "listing_lng");



CREATE INDEX "idx_listings_country" ON "public"."listings" USING "btree" ("country");



CREATE INDEX "idx_listings_country_city" ON "public"."listings" USING "btree" ("country", "city");



CREATE INDEX "idx_listings_created_at" ON "public"."listings" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_listings_price_amount" ON "public"."listings" USING "btree" ("price_amount");



CREATE INDEX "idx_listings_search" ON "public"."listings" USING "gin" ("to_tsvector"('"simple"'::"regconfig", COALESCE("search_text", ''::"text")));



CREATE INDEX "idx_listings_search_text_trgm" ON "public"."listings" USING "gin" ("search_text" "public"."gin_trgm_ops");



CREATE INDEX "idx_listings_search_vector" ON "public"."listings" USING "gin" ("search_vector");



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_listings_status_active_until" ON "public"."listings" USING "btree" ("status", "active_until" DESC);



CREATE INDEX "idx_listings_subcategory" ON "public"."listings" USING "btree" ("subcategory");



CREATE INDEX "idx_listings_user_id" ON "public"."listings" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_premium_invites_claimed_by" ON "public"."premium_invites" USING "btree" ("claimed_by");



CREATE INDEX "idx_premium_invites_code" ON "public"."premium_invites" USING "btree" ("invite_code");



CREATE INDEX "idx_profiles_home_coords" ON "public"."profiles" USING "btree" ("home_lat", "home_lng");



CREATE INDEX "idx_profiles_home_location" ON "public"."profiles" USING "btree" ("home_country", "home_city");



CREATE INDEX "idx_profiles_premium_until" ON "public"."profiles" USING "btree" ("premium_until");



CREATE INDEX "idx_store_categories_user" ON "public"."store_categories" USING "btree" ("user_id");



CREATE INDEX "idx_store_categories_user_id" ON "public"."store_categories" USING "btree" ("user_id");



CREATE INDEX "idx_store_follows_follower_id" ON "public"."store_follows" USING "btree" ("follower_id");



CREATE INDEX "idx_store_follows_store_owner_id" ON "public"."store_follows" USING "btree" ("store_owner_id");



CREATE INDEX "listing_boosts_active_idx" ON "public"."listing_boosts" USING "btree" ("status", "starts_at", "ends_at");



CREATE INDEX "listing_boosts_listing_id_idx" ON "public"."listing_boosts" USING "btree" ("listing_id");



CREATE INDEX "listing_boosts_scope_idx" ON "public"."listing_boosts" USING "btree" ("scope");



CREATE INDEX "listing_boosts_user_id_idx" ON "public"."listing_boosts" USING "btree" ("user_id");



CREATE INDEX "listing_translations_language_idx" ON "public"."listing_translations" USING "btree" ("language");



CREATE INDEX "listing_translations_listing_id_idx" ON "public"."listing_translations" USING "btree" ("listing_id");



CREATE INDEX "listings_category_idx" ON "public"."listings" USING "btree" ("category");



CREATE INDEX "listings_created_at_idx" ON "public"."listings" USING "btree" ("created_at" DESC);



CREATE INDEX "listings_created_by_user_id_idx" ON "public"."listings" USING "btree" ("created_by_user_id");



CREATE INDEX "listings_details_gin_idx" ON "public"."listings" USING "gin" ("details");



CREATE INDEX "listings_featured_until_idx" ON "public"."listings" USING "btree" ("featured_until");



CREATE INDEX "listings_identity_id_idx" ON "public"."listings" USING "btree" ("identity_id");



CREATE INDEX "listings_item_type_idx" ON "public"."listings" USING "btree" ("item_type");



CREATE INDEX "listings_search_text_idx" ON "public"."listings" USING "gin" ("to_tsvector"('"simple"'::"regconfig", COALESCE("search_text", ''::"text")));



CREATE INDEX "listings_status_idx" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "listings_subcategory_idx" ON "public"."listings" USING "btree" ("subcategory");



CREATE INDEX "listings_updated_by_user_id_idx" ON "public"."listings" USING "btree" ("updated_by_user_id");



CREATE INDEX "listings_user_id_idx" ON "public"."listings" USING "btree" ("user_id");



CREATE INDEX "location_search_cache_query_idx" ON "public"."location_search_cache" USING "btree" ("lower"("query"), "lower"(COALESCE("country", ''::"text")));



CREATE INDEX "messages_sender_identity_id_idx" ON "public"."messages" USING "btree" ("sender_identity_id");



CREATE INDEX "product_showcases_identity_status_order_idx" ON "public"."product_showcases" USING "btree" ("identity_id", "status", "sort_order", "created_at" DESC);



CREATE INDEX "product_showcases_public_order_idx" ON "public"."product_showcases" USING "btree" ("identity_id", "sort_order", "created_at" DESC) WHERE ("status" = 'published'::"text");



CREATE INDEX "profiles_active_identity_id_idx" ON "public"."profiles" USING "btree" ("active_identity_id");



CREATE UNIQUE INDEX "profiles_store_slug_unique_idx" ON "public"."profiles" USING "btree" ("lower"("store_slug")) WHERE (("store_slug" IS NOT NULL) AND ("store_slug" <> ''::"text"));



CREATE INDEX "services_identity_status_order_idx" ON "public"."services" USING "btree" ("identity_id", "status", "sort_order", "created_at" DESC);



CREATE INDEX "services_public_discovery_idx" ON "public"."services" USING "btree" ("country", "city", "category", "subcategory", "created_at" DESC) WHERE ("status" = 'published'::"text");



CREATE UNIQUE INDEX "store_categories_child_name_unique_idx" ON "public"."store_categories" USING "btree" ("identity_id", "parent_id", "lower"("name")) WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "store_categories_identity_id_idx" ON "public"."store_categories" USING "btree" ("identity_id");



CREATE INDEX "store_categories_identity_parent_sort_idx" ON "public"."store_categories" USING "btree" ("identity_id", "parent_id", "sort_order", "created_at");



CREATE INDEX "store_categories_identity_sort_idx" ON "public"."store_categories" USING "btree" ("identity_id", "sort_order", "created_at");



CREATE UNIQUE INDEX "store_categories_root_name_unique_idx" ON "public"."store_categories" USING "btree" ("identity_id", "lower"("name")) WHERE ("parent_id" IS NULL);



CREATE INDEX "store_follows_follower_identity_id_idx" ON "public"."store_follows" USING "btree" ("follower_identity_id");



CREATE UNIQUE INDEX "store_follows_identity_unique" ON "public"."store_follows" USING "btree" ("follower_identity_id", "store_identity_id");



CREATE UNIQUE INDEX "store_follows_identity_unique_idx" ON "public"."store_follows" USING "btree" ("follower_identity_id", "store_identity_id") WHERE (("follower_identity_id" IS NOT NULL) AND ("store_identity_id" IS NOT NULL));



CREATE INDEX "store_follows_store_identity_id_idx" ON "public"."store_follows" USING "btree" ("store_identity_id");



CREATE OR REPLACE TRIGGER "prepare_store_category_name_before_write" BEFORE INSERT OR UPDATE OF "name" ON "public"."store_categories" FOR EACH ROW EXECUTE FUNCTION "public"."prepare_store_category_name"();



CREATE OR REPLACE TRIGGER "trg_product_showcases_set_updated_at" BEFORE UPDATE ON "public"."product_showcases" FOR EACH ROW EXECUTE FUNCTION "public"."set_v2_profile_content_updated_at"();



CREATE OR REPLACE TRIGGER "trg_services_set_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_v2_profile_content_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_listing_search_vector" BEFORE INSERT OR UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_listing_search_vector"();



CREATE OR REPLACE TRIGGER "validate_profile_active_identity_before_write" BEFORE UPDATE OF "active_identity_id" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."validate_profile_active_identity_v2"();



CREATE OR REPLACE TRIGGER "validate_store_category_parent_before_write" BEFORE INSERT OR UPDATE OF "parent_id", "identity_id" ON "public"."store_categories" FOR EACH ROW EXECUTE FUNCTION "public"."validate_store_category_parent"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_business_account_id_fkey" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_category_corrections"
    ADD CONSTRAINT "ai_category_corrections_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_category_corrections"
    ADD CONSTRAINT "ai_category_corrections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_usage_daily"
    ADD CONSTRAINT "ai_usage_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_accounts"
    ADD CONSTRAINT "business_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."business_accounts"
    ADD CONSTRAINT "business_accounts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_accounts"
    ADD CONSTRAINT "business_accounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_business_account_id_fkey" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."business_members"
    ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_business_account_id_fkey" FOREIGN KEY ("business_account_id") REFERENCES "public"."business_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."identity_profiles"
    ADD CONSTRAINT "identity_profiles_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."listing_boosts"
    ADD CONSTRAINT "listing_boosts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_boosts"
    ADD CONSTRAINT "listing_boosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_images"
    ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_images"
    ADD CONSTRAINT "listing_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_store_categories"
    ADD CONSTRAINT "listing_store_categories_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_store_categories"
    ADD CONSTRAINT "listing_store_categories_store_category_id_fkey" FOREIGN KEY ("store_category_id") REFERENCES "public"."store_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listing_translations"
    ADD CONSTRAINT "listing_translations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."premium_invites"
    ADD CONSTRAINT "premium_invites_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."premium_invites"
    ADD CONSTRAINT "premium_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_showcases"
    ADD CONSTRAINT "product_showcases_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_identity_id_fkey" FOREIGN KEY ("active_identity_id") REFERENCES "public"."identities"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_categories"
    ADD CONSTRAINT "store_categories_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_categories"
    ADD CONSTRAINT "store_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."store_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."store_categories"
    ADD CONSTRAINT "store_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_follows"
    ADD CONSTRAINT "store_follows_store_owner_id_fkey" FOREIGN KEY ("store_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_trust_metrics"
    ADD CONSTRAINT "user_trust_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Business members can read activity log" ON "public"."activity_log" FOR SELECT USING ((("actor_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."business_members"
  WHERE (("business_members"."business_account_id" = "activity_log"."business_account_id") AND ("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."status" = 'active'::"text"))))));



CREATE POLICY "Business members can read business identities" ON "public"."identities" FOR SELECT USING ((("type" = 'business'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."business_members"
  WHERE (("business_members"."business_account_id" = "identities"."business_account_id") AND ("business_members"."user_id" = "auth"."uid"()) AND ("business_members"."status" = 'active'::"text"))))));



CREATE POLICY "Business members can read members" ON "public"."business_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."business_members" "bm"
  WHERE (("bm"."business_account_id" = "business_members"."business_account_id") AND ("bm"."user_id" = "auth"."uid"()) AND ("bm"."status" = 'active'::"text"))))));



CREATE POLICY "Business owners can manage business identities" ON "public"."identities" USING ((("type" = 'business'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."business_accounts"
  WHERE (("business_accounts"."id" = "identities"."business_account_id") AND ("business_accounts"."owner_user_id" = "auth"."uid"())))))) WITH CHECK ((("type" = 'business'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."business_accounts"
  WHERE (("business_accounts"."id" = "identities"."business_account_id") AND ("business_accounts"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "Business owners can manage identity profile" ON "public"."identity_profiles" USING ((EXISTS ( SELECT 1
   FROM ("public"."identities" "i"
     JOIN "public"."business_accounts" "b" ON (("b"."id" = "i"."business_account_id")))
  WHERE (("i"."id" = "identity_profiles"."identity_id") AND ("i"."type" = 'business'::"text") AND ("b"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."identities" "i"
     JOIN "public"."business_accounts" "b" ON (("b"."id" = "i"."business_account_id")))
  WHERE (("i"."id" = "identity_profiles"."identity_id") AND ("i"."type" = 'business'::"text") AND ("b"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Business owners can manage members" ON "public"."business_members" USING ((EXISTS ( SELECT 1
   FROM "public"."business_accounts"
  WHERE (("business_accounts"."id" = "business_members"."business_account_id") AND ("business_accounts"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."business_accounts"
  WHERE (("business_accounts"."id" = "business_members"."business_account_id") AND ("business_accounts"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "Conversation creator can view created conversation" ON "public"."conversations" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Listing owners can manage translations" ON "public"."listing_translations" USING ((EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_translations"."listing_id") AND ("listings"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_translations"."listing_id") AND ("listings"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners and members can read business accounts" ON "public"."business_accounts" FOR SELECT USING ((("owner_user_id" = "auth"."uid"()) OR "public"."is_business_member"("id")));



CREATE POLICY "Owners can delete business accounts" ON "public"."business_accounts" FOR DELETE USING (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Owners can update business accounts" ON "public"."business_accounts" FOR UPDATE USING (("owner_user_id" = "auth"."uid"())) WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Private identity owners can manage profile" ON "public"."identity_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."identities" "i"
  WHERE (("i"."id" = "identity_profiles"."identity_id") AND ("i"."type" = 'private'::"text") AND ("i"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."identities" "i"
  WHERE (("i"."id" = "identity_profiles"."identity_id") AND ("i"."type" = 'private'::"text") AND ("i"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public can read active listing translations" ON "public"."listing_translations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_translations"."listing_id") AND ("listings"."status" = 'active'::"text")))));



CREATE POLICY "Public can read identity profiles" ON "public"."identity_profiles" FOR SELECT USING (true);



CREATE POLICY "Public can view active boosts" ON "public"."listing_boosts" FOR SELECT USING ((("status" = 'active'::"text") AND ("starts_at" <= "now"()) AND ("ends_at" > "now"())));



CREATE POLICY "Public can view listings" ON "public"."listings" FOR SELECT USING (true);



CREATE POLICY "Public can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can claim available premium invites" ON "public"."premium_invites" FOR UPDATE TO "authenticated" USING ((("claimed_by" IS NULL) AND ("uses_count" < "max_uses") AND (("expires_at" IS NULL) OR ("expires_at" > "now"())))) WITH CHECK ((("claimed_by" = "auth"."uid"()) AND ("uses_count" = 1)));



CREATE POLICY "Users can create boosts for their own listings" ON "public"."listing_boosts" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."listings"
  WHERE (("listings"."id" = "listing_boosts"."listing_id") AND ("listings"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can create own blocks" ON "public"."user_blocks" FOR INSERT TO "authenticated" WITH CHECK (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can create own follows" ON "public"."store_follows" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own blocks" ON "public"."user_blocks" FOR DELETE TO "authenticated" USING (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own conversations" ON "public"."conversations" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete own follows" ON "public"."store_follows" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can delete own listings" ON "public"."listings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete their own images" ON "public"."listing_images" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow stores" ON "public"."store_follows" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "follower_id") AND ("follower_id" <> "store_owner_id")));



CREATE POLICY "Users can insert conversation participants" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ("c"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Users can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own AI corrections" ON "public"."ai_category_corrections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own AI usage" ON "public"."ai_usage_daily" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own business accounts" ON "public"."business_accounts" FOR INSERT WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own listings" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own images" ON "public"."listing_images" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their private identities" ON "public"."identities" USING ((("type" = 'private'::"text") AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("type" = 'private'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can read their private identities" ON "public"."identities" FOR SELECT USING ((("type" = 'private'::"text") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can unfollow stores" ON "public"."store_follows" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can update own AI usage" ON "public"."ai_usage_daily" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own listings" ON "public"."listings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own participants" ON "public"."conversation_participants" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own boosts" ON "public"."listing_boosts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all images" ON "public"."listing_images" FOR SELECT USING (true);



CREATE POLICY "Users can view buyer seller conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("buyer_id" = "auth"."uid"()) OR ("seller_id" = "auth"."uid"())));



CREATE POLICY "Users can view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own AI corrections" ON "public"."ai_category_corrections" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own AI usage" ON "public"."ai_usage_daily" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own blocks" ON "public"."user_blocks" FOR SELECT TO "authenticated" USING ((("blocker_id" = "auth"."uid"()) OR ("blocked_id" = "auth"."uid"())));



CREATE POLICY "Users can view own conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own participants" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own reports" ON "public"."reports" FOR SELECT TO "authenticated" USING (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own boosts" ON "public"."listing_boosts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own premium invites" ON "public"."premium_invites" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "created_by") OR ("auth"."uid"() = "claimed_by")));



CREATE POLICY "Users can view their own store follows" ON "public"."store_follows" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "follower_id") OR ("auth"."uid"() = "store_owner_id")));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_category_corrections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."city_geocache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."identity_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_boosts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_store_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listing_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_search_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."premium_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product showcases authenticated read" ON "public"."product_showcases" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") OR "public"."current_user_has_identity_access"("identity_id")));



CREATE POLICY "product showcases public read" ON "public"."product_showcases" FOR SELECT TO "anon" USING (("status" = 'published'::"text"));



ALTER TABLE "public"."product_showcases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "services authenticated read" ON "public"."services" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") OR "public"."current_user_has_identity_access"("identity_id")));



CREATE POLICY "services public read" ON "public"."services" FOR SELECT TO "anon" USING (("status" = 'published'::"text"));



ALTER TABLE "public"."store_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_trust_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can manage own listing store categories" ON "public"."listing_store_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_store_categories"."listing_id") AND ("l"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."listings" "l"
  WHERE (("l"."id" = "listing_store_categories"."listing_id") AND ("l"."user_id" = "auth"."uid"())))));



CREATE POLICY "users can manage own store categories" ON "public"."store_categories" TO "authenticated" USING ((("auth"."uid"() = "user_id") AND "public"."current_user_has_identity_access"("identity_id"))) WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."current_user_has_identity_access"("identity_id")));



COMMENT ON POLICY "users can manage own store categories" ON "public"."store_categories" IS 'Authenticated users may manage rows written under their own user_id only when they also have access to the category identity.';



CREATE POLICY "users can read listing store categories" ON "public"."listing_store_categories" FOR SELECT USING (true);



CREATE POLICY "users can read store categories" ON "public"."store_categories" FOR SELECT USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text", "p_thumb_url" "text", "p_max_images" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text", "p_thumb_url" "text", "p_max_images" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text", "p_thumb_url" "text", "p_max_images" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_identities_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_identities_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_identities_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_identity_detail"("p_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_identity_detail"("p_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_identity_detail"("p_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_identity_plan"("p_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_identity_plan"("p_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_identity_plan"("p_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_report_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_report_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_report_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_reports_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reports_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reports_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_identity_plan"("p_identity_id" "uuid", "p_plan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_identity_plan"("p_identity_id" "uuid", "p_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_identity_plan"("p_identity_id" "uuid", "p_plan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_report_status"("p_report_id" bigint, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_report_status"("p_report_id" bigint, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_report_status"("p_report_id" bigint, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_conversation_if_all_deleted"("target_conversation_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_conversation_if_all_deleted"("target_conversation_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_conversation_if_all_deleted"("target_conversation_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."block_store_identity_owner"("p_store_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."block_store_identity_owner"("p_store_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_store_identity_owner"("p_store_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_premium_invite"("input_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_premium_invite"("input_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_premium_invite"("input_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_my_store_child_category_v2"("p_parent_id" "uuid", "p_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_my_store_root_category_v2"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_premium_invite"("premium_days_input" integer, "expires_in_days_input" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_premium_invite"("premium_days_input" integer, "expires_in_days_input" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_premium_invite"("premium_days_input" integer, "expires_in_days_input" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_my_store_category_v2"("p_category_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_feed_identity_profiles"("p_identity_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feed_identity_profiles"("p_identity_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feed_identity_profiles"("p_identity_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_identity_profile_slug"("p_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_identity_profile_slug"("p_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_identity_profile_slug"("p_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_identity_store_follow_status_v2"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_identity_store_follow_status_v2"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_identity_store_follow_status_v2"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_listing_details"("p_listing_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_listing_details"("p_listing_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_listing_details"("p_listing_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketplace_identity_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketplace_identity_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketplace_identity_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketplace_listings"("result_limit" integer, "result_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketplace_listings"("result_limit" integer, "result_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketplace_listings"("result_limit" integer, "result_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision, "center_lng" double precision, "result_limit" integer, "result_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision, "center_lng" double precision, "result_limit" integer, "result_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision, "center_lng" double precision, "result_limit" integer, "result_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_active_identity_profile_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_admin_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_admin_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_admin_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_identities"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_identities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_identities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_identity_listings"("result_limit" integer, "result_offset" integer, "status_filter" "text", "search_query" "text", "store_category_filter" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_identity_listings"("result_limit" integer, "result_offset" integer, "status_filter" "text", "search_query" "text", "store_category_filter" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_identity_listings"("result_limit" integer, "result_offset" integer, "status_filter" "text", "search_query" "text", "store_category_filter" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_store_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_store_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_store_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_follow_state_identity"("p_follower_identity_id" "uuid", "p_store_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_listings"("store_identity_id" "uuid", "viewer_user_id" "uuid", "search_query" "text", "include_inactive" boolean, "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_listings"("store_identity_id" "uuid", "viewer_user_id" "uuid", "search_query" "text", "include_inactive" boolean, "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_listings"("store_identity_id" "uuid", "viewer_user_id" "uuid", "search_query" "text", "include_inactive" boolean, "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_business_member"("business_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_business_member"("business_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_business_member"("business_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prepare_store_category_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."prepare_store_category_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_store_category_name"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rename_my_store_category_v2"("p_category_id" "uuid", "p_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."require_my_active_identity_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."require_my_active_identity_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_conversation_for_participants"("target_conversation_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."restore_conversation_for_participants"("target_conversation_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_conversation_for_participants"("target_conversation_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_my_active_identity_profile"("p_display_name" "text", "p_slug" "text", "p_bio" "text", "p_avatar_url" "text", "p_banner_url" "text", "p_banner_dominant_color" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_my_active_identity_profile"("p_display_name" "text", "p_slug" "text", "p_bio" "text", "p_avatar_url" "text", "p_banner_url" "text", "p_banner_dominant_color" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_active_identity_profile"("p_display_name" "text", "p_slug" "text", "p_bio" "text", "p_avatar_url" "text", "p_banner_url" "text", "p_banner_dominant_color" "text") TO "service_role";



GRANT ALL ON TABLE "public"."product_showcases" TO "service_role";
GRANT SELECT ON TABLE "public"."product_showcases" TO "anon";
GRANT SELECT ON TABLE "public"."product_showcases" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_image_url" "text", "p_external_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_image_url" "text", "p_external_url" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."save_my_product_showcase_v2"("p_showcase_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_image_url" "text", "p_external_url" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."services" TO "service_role";
GRANT SELECT ON TABLE "public"."services" TO "anon";
GRANT SELECT ON TABLE "public"."services" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_subcategory" "text", "p_image_url" "text", "p_price_amount" numeric, "p_currency" "text", "p_price_type" "text", "p_country" "text", "p_city" "text", "p_location" "text", "p_service_lat" double precision, "p_service_lng" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_subcategory" "text", "p_image_url" "text", "p_price_amount" numeric, "p_currency" "text", "p_price_type" "text", "p_country" "text", "p_city" "text", "p_location" "text", "p_service_lat" double precision, "p_service_lng" double precision) TO "service_role";
GRANT ALL ON FUNCTION "public"."save_my_service_v2"("p_service_id" "uuid", "p_title" "text", "p_description" "text", "p_category" "text", "p_subcategory" "text", "p_image_url" "text", "p_price_amount" numeric, "p_currency" "text", "p_price_type" "text", "p_country" "text", "p_city" "text", "p_location" "text", "p_service_lat" double precision, "p_service_lng" double precision) TO "authenticated";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_my_active_identity_v2"("p_identity_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_my_product_showcase_status_v2"("p_showcase_id" "uuid", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_my_service_status_v2"("p_service_id" "uuid", "p_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_v2_profile_content_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_v2_profile_content_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_v2_profile_content_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_v2_profile_content_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_identity_report"("p_reported_identity_id" "uuid", "p_reason" "text", "p_details" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_identity_report"("p_reported_identity_id" "uuid", "p_reason" "text", "p_details" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_identity_report"("p_reported_identity_id" "uuid", "p_reason" "text", "p_details" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_store_follow_identity"("p_store_identity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_store_follow_identity"("p_store_identity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_store_follow_identity"("p_store_identity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_listing_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_listing_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_listing_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_my_active_identity_location"("p_country" "text", "p_city" "text", "p_lat" double precision, "p_lng" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."update_my_active_identity_location"("p_country" "text", "p_city" "text", "p_lat" double precision, "p_lng" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_active_identity_location"("p_country" "text", "p_city" "text", "p_lat" double precision, "p_lng" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text", "p_detail_category" "text", "p_country" "text", "p_city" "text", "p_listing_lat" double precision, "p_listing_lng" double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text", "p_detail_category" "text", "p_country" "text", "p_city" "text", "p_listing_lat" double precision, "p_listing_lng" double precision) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text", "p_detail_category" "text", "p_country" "text", "p_city" "text", "p_listing_lat" double precision, "p_listing_lng" double precision) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."validate_profile_active_identity_v2"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_profile_active_identity_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_store_category_parent"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_store_category_parent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_store_category_parent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."ai_category_corrections" TO "anon";
GRANT ALL ON TABLE "public"."ai_category_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_category_corrections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_category_corrections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_category_corrections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_category_corrections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_daily" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_daily" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_usage_daily_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_usage_daily_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_usage_daily_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_events" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_events" TO "service_role";



GRANT ALL ON TABLE "public"."business_accounts" TO "anon";
GRANT ALL ON TABLE "public"."business_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."business_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."business_members" TO "anon";
GRANT ALL ON TABLE "public"."business_members" TO "authenticated";
GRANT ALL ON TABLE "public"."business_members" TO "service_role";



GRANT ALL ON TABLE "public"."city_geocache" TO "anon";
GRANT ALL ON TABLE "public"."city_geocache" TO "authenticated";
GRANT ALL ON TABLE "public"."city_geocache" TO "service_role";



GRANT ALL ON SEQUENCE "public"."city_geocache_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."city_geocache_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."city_geocache_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."conversation_participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."conversation_participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."conversation_participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."conversations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."conversations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."conversations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."identities" TO "anon";
GRANT ALL ON TABLE "public"."identities" TO "authenticated";
GRANT ALL ON TABLE "public"."identities" TO "service_role";



GRANT ALL ON TABLE "public"."identity_profiles" TO "anon";
GRANT ALL ON TABLE "public"."identity_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."identity_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."listing_boosts" TO "anon";
GRANT ALL ON TABLE "public"."listing_boosts" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_boosts" TO "service_role";



GRANT ALL ON TABLE "public"."listing_images" TO "anon";
GRANT ALL ON TABLE "public"."listing_images" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_images" TO "service_role";



GRANT ALL ON TABLE "public"."listing_store_categories" TO "anon";
GRANT ALL ON TABLE "public"."listing_store_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_store_categories" TO "service_role";



GRANT ALL ON TABLE "public"."listing_translations" TO "anon";
GRANT ALL ON TABLE "public"."listing_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."listing_translations" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."listings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."listings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."listings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."location_search_cache" TO "anon";
GRANT ALL ON TABLE "public"."location_search_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."location_search_cache" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."premium_invites" TO "anon";
GRANT ALL ON TABLE "public"."premium_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."premium_invites" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."store_categories" TO "anon";
GRANT ALL ON TABLE "public"."store_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."store_categories" TO "service_role";



GRANT ALL ON TABLE "public"."store_follows" TO "anon";
GRANT ALL ON TABLE "public"."store_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."store_follows" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_blocks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_blocks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_blocks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_trust_metrics" TO "anon";
GRANT ALL ON TABLE "public"."user_trust_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_trust_metrics" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

revoke references on table "public"."product_showcases" from "anon";

revoke trigger on table "public"."product_showcases" from "anon";

revoke truncate on table "public"."product_showcases" from "anon";

revoke references on table "public"."product_showcases" from "authenticated";

revoke trigger on table "public"."product_showcases" from "authenticated";

revoke truncate on table "public"."product_showcases" from "authenticated";

revoke references on table "public"."services" from "anon";

revoke trigger on table "public"."services" from "anon";

revoke truncate on table "public"."services" from "anon";

revoke references on table "public"."services" from "authenticated";

revoke trigger on table "public"."services" from "authenticated";

revoke truncate on table "public"."services" from "authenticated";

alter table "public"."store_categories" drop constraint "store_categories_name_valid_check";

alter table "public"."store_categories" add constraint "store_categories_name_valid_check" CHECK ((((char_length(name) >= 1) AND (char_length(name) <= 60)) AND (name = regexp_replace(btrim(name), '[[:space:]]+'::text, ' '::text, 'g'::text)))) not valid;

alter table "public"."store_categories" validate constraint "store_categories_name_valid_check";


  create policy "Anyone can view listing images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'listing-images'::text));



  create policy "Identity media public read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'identity-media'::text));



  create policy "Participants can upload message images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'messages'::text) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = (split_part(objects.name, '/'::text, 1))::bigint) AND (cp.user_id = auth.uid()))))));



  create policy "Participants can view message images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'messages'::text) AND (EXISTS ( SELECT 1
   FROM public.conversation_participants cp
  WHERE ((cp.conversation_id = (split_part(objects.name, '/'::text, 1))::bigint) AND (cp.user_id = auth.uid()))))));



  create policy "Users can delete their own listing images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'listing-images'::text) AND (owner = auth.uid())));



  create policy "Users can update their own listing images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'listing-images'::text) AND (owner = auth.uid())));



  create policy "Users can upload listing images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'listing-images'::text));



  create policy "Users delete own identity media"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'identity-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users update own identity media"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'identity-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users upload own identity media"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'identity-media'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
