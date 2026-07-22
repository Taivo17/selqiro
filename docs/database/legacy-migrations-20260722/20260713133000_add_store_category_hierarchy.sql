begin;

alter table public.store_categories
  add column if not exists parent_id uuid null;

comment on column public.store_categories.parent_id is
  'Optional parent store category. V2 UI supports two levels, while the database model allows deeper trees later.';

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_categories'::regclass
      and conname = 'store_categories_parent_id_fkey'
  ) then
    alter table public.store_categories
      add constraint store_categories_parent_id_fkey
      foreign key (parent_id)
      references public.store_categories(id)
      on delete restrict;
  end if;
end
$migration$;

create index if not exists store_categories_identity_parent_sort_idx
  on public.store_categories (
    identity_id,
    parent_id,
    sort_order,
    created_at
  );

create or replace function public.validate_store_category_parent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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
$function$;

drop trigger if exists validate_store_category_parent_before_write
  on public.store_categories;

create trigger validate_store_category_parent_before_write
before insert or update of parent_id, identity_id
on public.store_categories
for each row
execute function public.validate_store_category_parent();

commit;
