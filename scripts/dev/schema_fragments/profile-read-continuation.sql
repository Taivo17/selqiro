create table if not exists
  public.service_categories (
    code text primary key,
    parent_code text null
      references public.service_categories(code)
      on update cascade
      on delete restrict,
    label_et text not null,
    label_en text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint service_categories_code_check
      check (
        code ~ '^[a-z0-9_]{2,80}$'
      ),

    constraint service_categories_parent_check
      check (
        parent_code is null
        or parent_code <> code
      ),

    constraint service_categories_label_et_check
      check (
        char_length(
          btrim(label_et)
        ) between 2 and 120
      ),

    constraint service_categories_label_en_check
      check (
        char_length(
          btrim(label_en)
        ) between 2 and 120
      ),

    constraint service_categories_sort_order_check
      check (
        sort_order >= 0
      )
  );

alter table
  public.service_categories
enable row level security;

create policy
  "service categories public read"
on public.service_categories
for select
to anon, authenticated
using (
  is_active = true
);

revoke all
on table
  public.service_categories
from public;

grant select
on table
  public.service_categories
to anon, authenticated;

ALTER TABLE "public"."store_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read store categories" ON "public"."store_categories" FOR SELECT USING (true);

GRANT SELECT ON TABLE public.store_categories TO anon;
NOTIFY pgrst,'reload schema';
