begin;

create or replace function public.prepare_store_category_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
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
$function$;

drop trigger if exists prepare_store_category_name_before_write
  on public.store_categories;

create trigger prepare_store_category_name_before_write
before insert or update of name
on public.store_categories
for each row
execute function public.prepare_store_category_name();

update public.store_categories
set name = regexp_replace(
  btrim(name),
  '[[:space:]]+',
  ' ',
  'g'
)
where name is distinct from regexp_replace(
  btrim(name),
  '[[:space:]]+',
  ' ',
  'g'
);

do $migration$
begin
  if exists (
    select 1
    from public.store_categories
    where identity_id is null
  ) then
    raise exception
      'Cannot require identity_id because identityless store categories exist.';
  end if;

  if exists (
    select 1
    from (
      select
        identity_id,
        parent_id,
        lower(name) as normalized_name,
        count(*) as category_count
      from public.store_categories
      group by
        identity_id,
        parent_id,
        lower(name)
      having count(*) > 1
    ) duplicate_categories
  ) then
    raise exception
      'Cannot add store category uniqueness because duplicate sibling names exist.';
  end if;
end;
$migration$;

alter table public.store_categories
  alter column identity_id set not null;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.store_categories'::regclass
      and conname = 'store_categories_name_valid_check'
  ) then
    alter table public.store_categories
      add constraint store_categories_name_valid_check
      check (
        char_length(name) between 1 and 60
        and name = regexp_replace(
          btrim(name),
          '[[:space:]]+',
          ' ',
          'g'
        )
      );
  end if;
end;
$migration$;

create unique index if not exists
  store_categories_root_name_unique_idx
on public.store_categories (
  identity_id,
  lower(name)
)
where parent_id is null;

create unique index if not exists
  store_categories_child_name_unique_idx
on public.store_categories (
  identity_id,
  parent_id,
  lower(name)
)
where parent_id is not null;

comment on column public.store_categories.name is
  'Owner-defined store category name. Normalized and limited to 60 characters. Unique among sibling categories within the same identity.';

commit;
