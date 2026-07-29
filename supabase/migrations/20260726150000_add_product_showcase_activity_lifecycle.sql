alter table public.product_showcases
  add column if not exists
    last_confirmed_at timestamptz,
  add column if not exists
    active_until timestamptz;

comment on column
  public.product_showcases.last_confirmed_at
is
  'Latest server-side owner confirmation that the published showcase content is current.';

comment on column
  public.product_showcases.active_until
is
  'Public visibility expiry. Product showcases use a 365-day activity period.';


drop trigger if exists
  trg_product_showcases_set_updated_at
on public.product_showcases;


create or replace function
  public.set_product_showcase_content_activity_v2()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz := now();
  v_content_changed boolean;
begin
  /*
   * published_at is the first-publication timestamp.
   * Once present, later edits, hiding, archiving and
   * re-publication must not replace it.
   */
  if old.published_at is not null then
    new.published_at :=
      old.published_at;
  elsif new.status = 'published' then
    new.published_at :=
      coalesce(
        new.published_at,
        v_now
      );
  else
    new.published_at := null;
  end if;

  v_content_changed :=
    row(
      new.title,
      new.description,
      new.category,
      new.image_url,
      new.external_url,
      new.sort_order,
      new.status
    )
    is distinct from
    row(
      old.title,
      old.description,
      old.category,
      old.image_url,
      old.external_url,
      old.sort_order,
      old.status
    );

  if not v_content_changed then
    /*
     * Lifecycle-only updates, including explicit
     * activity confirmation, must not pretend that
     * the showcase content itself was edited.
     */
    new.updated_at :=
      old.updated_at;

    return new;
  end if;

  new.updated_at := v_now;

  /*
   * A first publication starts the activity period.
   *
   * A substantive edit renews the period automatically
   * only while the published showcase is still active.
   * An already expired showcase requires the explicit
   * owner confirmation RPC before becoming public again.
   */
  if
    new.status = 'published'
    and (
      old.status <> 'published'
      or (
        old.active_until is not null
        and old.active_until > v_now
      )
    )
  then
    new.last_confirmed_at :=
      v_now;

    new.active_until :=
      v_now + interval '365 days';
  end if;

  return new;
end;
$function$;

alter function
  public.set_product_showcase_content_activity_v2()
owner to postgres;

comment on function
  public.set_product_showcase_content_activity_v2()
is
  'Preserves first publication time and renews published showcase activity after substantive content changes.';


create trigger
  trg_product_showcases_set_content_activity_v2
before update of
  title,
  description,
  category,
  image_url,
  external_url,
  sort_order,
  status,
  published_at
on public.product_showcases
for each row
execute function
  public.set_product_showcase_content_activity_v2();


/*
 * One-time transition rule:
 * all showcases that were already published when
 * this lifecycle was introduced receive a complete
 * initial 365-day period from this migration.
 */
update public.product_showcases
set
  last_confirmed_at =
    coalesce(
      last_confirmed_at,
      now()
    ),
  active_until =
    coalesce(
      active_until,
      now() + interval '365 days'
    )
where status = 'published';


alter table public.product_showcases
  drop constraint if exists
    product_showcases_published_activity_check;

alter table public.product_showcases
  add constraint
    product_showcases_published_activity_check
  check (
    status <> 'published'
    or (
      last_confirmed_at is not null
      and active_until is not null
      and active_until >
        last_confirmed_at
    )
  );


create index if not exists
  product_showcases_identity_activity_idx
on public.product_showcases (
  identity_id,
  status,
  active_until,
  sort_order,
  created_at desc
);

create or replace function
  public.confirm_my_product_showcase_activity_v2(
    p_showcase_id uuid
  )
returns setof public.product_showcases
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_active_identity_id uuid :=
    public.require_my_active_identity_v2();

  v_now timestamptz :=
    now();

  v_showcase public.product_showcases%rowtype;
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

  if v_showcase.status <> 'published' then
    raise exception
      'Only a published product showcase can have its activity confirmed.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.product_showcase_images image
    where image.showcase_id =
      p_showcase_id
  ) then
    raise exception
      'A product showcase must contain at least one image before activity can be confirmed.'
      using errcode = '22023';
  end if;

  /*
   * Explicit confirmation is a freshness action,
   * not a content edit.
   *
   * The product-showcase content trigger does not
   * run for these lifecycle-only columns, so the
   * existing updated_at value remains unchanged.
   */
  update public.product_showcases showcase
  set
    last_confirmed_at =
      v_now,
    active_until =
      v_now + interval '365 days'
  where showcase.id =
      p_showcase_id
    and showcase.identity_id =
      v_active_identity_id
  returning *
  into v_showcase;

  return next v_showcase;
  return;
end;
$function$;

alter function
  public.confirm_my_product_showcase_activity_v2(
    uuid
  )
owner to postgres;

comment on function
  public.confirm_my_product_showcase_activity_v2(
    uuid
  )
is
  'Confirms a published active-identity product showcase as current for another 365 days without changing its content-edit timestamp.';

revoke all
on function
  public.confirm_my_product_showcase_activity_v2(
    uuid
  )
from public, anon;

grant execute
on function
  public.confirm_my_product_showcase_activity_v2(
    uuid
  )
to authenticated, service_role;

create or replace function
  public.touch_product_showcase_after_image_change_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz :=
    now();

  v_showcase_id uuid;
begin
  /*
   * Ignore an UPDATE that did not actually change any
   * public image information.
   */
  if
    tg_op = 'UPDATE'
    and row(
      new.original_url,
      new.medium_url,
      new.thumb_url,
      new.storage_path,
      new.sort_order,
      new.is_primary
    )
    is not distinct from
    row(
      old.original_url,
      old.medium_url,
      old.thumb_url,
      old.storage_path,
      old.sort_order,
      old.is_primary
    )
  then
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_showcase_id :=
      old.showcase_id;
  else
    v_showcase_id :=
      new.showcase_id;
  end if;

  /*
   * Every real gallery change is a substantive content
   * edit and therefore changes the parent updated_at.
   *
   * A still-active published showcase receives a new
   * 365-day period. An already expired showcase remains
   * expired until the owner explicitly confirms it.
   */
  update public.product_showcases showcase
  set
    updated_at =
      v_now,

    last_confirmed_at =
      case
        when
          showcase.status = 'published'
          and showcase.active_until is not null
          and showcase.active_until > v_now
        then v_now
        else showcase.last_confirmed_at
      end,

    active_until =
      case
        when
          showcase.status = 'published'
          and showcase.active_until is not null
          and showcase.active_until > v_now
        then v_now + interval '365 days'
        else showcase.active_until
      end
  where showcase.id =
    v_showcase_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

alter function
  public.touch_product_showcase_after_image_change_v2()
owner to postgres;

comment on function
  public.touch_product_showcase_after_image_change_v2()
is
  'Marks a product showcase as substantively edited after a real gallery change and renews activity only while the published showcase is still active.';

revoke all
on function
  public.touch_product_showcase_after_image_change_v2()
from public, anon, authenticated;


drop trigger if exists
  trg_product_showcase_images_touch_parent_after_insert_v2
on public.product_showcase_images;

create trigger
  trg_product_showcase_images_touch_parent_after_insert_v2
after insert
on public.product_showcase_images
for each row
execute function
  public.touch_product_showcase_after_image_change_v2();


drop trigger if exists
  trg_product_showcase_images_touch_parent_after_update_v2
on public.product_showcase_images;

create trigger
  trg_product_showcase_images_touch_parent_after_update_v2
after update of
  original_url,
  medium_url,
  thumb_url,
  storage_path,
  sort_order,
  is_primary
on public.product_showcase_images
for each row
execute function
  public.touch_product_showcase_after_image_change_v2();


drop trigger if exists
  trg_product_showcase_images_touch_parent_after_delete_v2
on public.product_showcase_images;

create trigger
  trg_product_showcase_images_touch_parent_after_delete_v2
after delete
on public.product_showcase_images
for each row
execute function
  public.touch_product_showcase_after_image_change_v2();

/*
 * Public visibility requires both:
 *
 * 1. published status;
 * 2. an activity period that has not expired.
 *
 * Identity members retain access to their own draft,
 * archived and expired content through the separate
 * ownership branch or ownership policy.
 */
drop policy if exists
  "product showcases authenticated read"
on public.product_showcases;

create policy
  "product showcases authenticated read"
on public.product_showcases
for select
to authenticated
using (
  (
    status = 'published'
    and active_until > now()
  )
  or public.current_user_has_identity_access(
    identity_id
  )
);


drop policy if exists
  "product showcases public read"
on public.product_showcases;

create policy
  "product showcases public read"
on public.product_showcases
for select
to anon
using (
  status = 'published'
  and active_until > now()
);


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
      and showcase.status =
        'published'
      and showcase.active_until >
        now()
  )
);


comment on column
  public.product_showcases.status
is
  'Draft and archived showcases are owner-only. Published showcases are publicly visible only while active_until is in the future.';
