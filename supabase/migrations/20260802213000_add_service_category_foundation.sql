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

comment on table
  public.service_categories
is
  'Global Selqiro service taxonomy. Codes are stable discovery values; labels may evolve independently.';

comment on column
  public.service_categories.code
is
  'Stable machine-readable category code stored in services.category or services.subcategory.';

comment on column
  public.service_categories.parent_code
is
  'Null for a root category; child categories reference their root. The database remains extensible to deeper levels later.';

create index if not exists
  service_categories_parent_order_idx
on public.service_categories (
  parent_code,
  sort_order,
  code
);

create index if not exists
  service_categories_active_root_order_idx
on public.service_categories (
  sort_order,
  code
)
where
  is_active = true
  and parent_code is null;

drop trigger if exists
  trg_service_categories_set_updated_at
on public.service_categories;

create trigger
  trg_service_categories_set_updated_at
before update
on public.service_categories
for each row
execute function
  public.set_v2_profile_content_updated_at();

alter table
  public.service_categories
enable row level security;

drop policy if exists
  "service categories public read"
on public.service_categories;

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

grant all
on table
  public.service_categories
to service_role;


insert into public.service_categories (
  code,
  parent_code,
  label_et,
  label_en,
  sort_order,
  is_active
)
values
  (
    'transport_roadside',
    null,
    'Transport ja autoabi',
    'Transport and roadside help',
    10,
    true
  ),
  (
    'vehicle_machinery',
    null,
    'Sõidukid ja tehnika',
    'Vehicles and machinery',
    20,
    true
  ),
  (
    'home_construction',
    null,
    'Kodu ja ehitus',
    'Home and construction',
    30,
    true
  ),
  (
    'garden_outdoor',
    null,
    'Aed ja väliala',
    'Garden and outdoors',
    40,
    true
  ),
  (
    'cleaning_maintenance',
    null,
    'Puhastus ja hooldus',
    'Cleaning and maintenance',
    50,
    true
  ),
  (
    'agriculture_forestry',
    null,
    'Põllumajandus ja metsandus',
    'Agriculture and forestry',
    60,
    true
  ),
  (
    'business_digital',
    null,
    'Äri- ja digiteenused',
    'Business and digital services',
    70,
    true
  ),
  (
    'events_food',
    null,
    'Üritused ja toitlustus',
    'Events and catering',
    80,
    true
  ),
  (
    'personal_family',
    null,
    'Isiklikud ja pereteenused',
    'Personal and family services',
    90,
    true
  ),
  (
    'property_security',
    null,
    'Kinnisvara ja turvalisus',
    'Property and security',
    100,
    true
  ),
  (
    'other_services',
    null,
    'Muud teenused',
    'Other services',
    110,
    true
  )
on conflict (code)
do update
set
  parent_code = excluded.parent_code,
  label_et = excluded.label_et,
  label_en = excluded.label_en,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();


insert into public.service_categories (
  code,
  parent_code,
  label_et,
  label_en,
  sort_order,
  is_active
)
values
  (
    'towing',
    'transport_roadside',
    'Puksiirabi',
    'Towing',
    10,
    true
  ),
  (
    'roadside_assistance',
    'transport_roadside',
    'Teeabi ja käivitusabi',
    'Roadside assistance',
    20,
    true
  ),
  (
    'vehicle_transport',
    'transport_roadside',
    'Sõidukite ja tehnika transport',
    'Vehicle and machinery transport',
    30,
    true
  ),
  (
    'courier_delivery',
    'transport_roadside',
    'Kuller- ja veoteenus',
    'Courier and delivery',
    40,
    true
  ),
  (
    'moving_transport',
    'transport_roadside',
    'Kolimine ja kaubavedu',
    'Moving and freight transport',
    50,
    true
  ),

  (
    'vehicle_repair',
    'vehicle_machinery',
    'Sõidukite remont',
    'Vehicle repair',
    10,
    true
  ),
  (
    'tire_service',
    'vehicle_machinery',
    'Rehvi- ja veljeteenus',
    'Tyre and wheel service',
    20,
    true
  ),
  (
    'vehicle_diagnostics',
    'vehicle_machinery',
    'Diagnostika ja elektritööd',
    'Diagnostics and electrical work',
    30,
    true
  ),
  (
    'small_engine_repair',
    'vehicle_machinery',
    'Väiketehnika hooldus',
    'Small engine maintenance',
    40,
    true
  ),
  (
    'machinery_repair',
    'vehicle_machinery',
    'Masinate ja rasketehnika remont',
    'Machinery and heavy equipment repair',
    50,
    true
  ),

  (
    'construction_renovation',
    'home_construction',
    'Ehitus ja remont',
    'Construction and renovation',
    10,
    true
  ),
  (
    'electrical_work',
    'home_construction',
    'Elektritööd',
    'Electrical work',
    20,
    true
  ),
  (
    'plumbing',
    'home_construction',
    'Santehnika',
    'Plumbing',
    30,
    true
  ),
  (
    'heating_cooling',
    'home_construction',
    'Küte, ventilatsioon ja jahutus',
    'Heating, ventilation and cooling',
    40,
    true
  ),
  (
    'roofing_facade',
    'home_construction',
    'Katused ja fassaadid',
    'Roofing and facades',
    50,
    true
  ),
  (
    'furniture_installation',
    'home_construction',
    'Mööbli valmistamine ja paigaldus',
    'Furniture making and installation',
    60,
    true
  ),

  (
    'lawn_garden_care',
    'garden_outdoor',
    'Muru- ja aiahooldus',
    'Lawn and garden care',
    10,
    true
  ),
  (
    'landscaping',
    'garden_outdoor',
    'Haljastus',
    'Landscaping',
    20,
    true
  ),
  (
    'tree_care',
    'garden_outdoor',
    'Puude hooldus ja raietööd',
    'Tree care and felling',
    30,
    true
  ),
  (
    'excavation_groundwork',
    'garden_outdoor',
    'Kaevetööd ja pinnasetööd',
    'Excavation and groundwork',
    40,
    true
  ),
  (
    'snow_removal',
    'garden_outdoor',
    'Lumekoristus',
    'Snow removal',
    50,
    true
  ),

  (
    'home_cleaning',
    'cleaning_maintenance',
    'Kodukoristus',
    'Home cleaning',
    10,
    true
  ),
  (
    'business_cleaning',
    'cleaning_maintenance',
    'Äripindade koristus',
    'Commercial cleaning',
    20,
    true
  ),
  (
    'window_cleaning',
    'cleaning_maintenance',
    'Akende pesu',
    'Window cleaning',
    30,
    true
  ),
  (
    'pressure_washing',
    'cleaning_maintenance',
    'Survepesu',
    'Pressure washing',
    40,
    true
  ),
  (
    'waste_removal',
    'cleaning_maintenance',
    'Jäätmete äravedu',
    'Waste removal',
    50,
    true
  ),

  (
    'agricultural_work',
    'agriculture_forestry',
    'Põllumajandustööd',
    'Agricultural work',
    10,
    true
  ),
  (
    'forestry_work',
    'agriculture_forestry',
    'Metsatööd',
    'Forestry work',
    20,
    true
  ),
  (
    'firewood',
    'agriculture_forestry',
    'Küttepuud ja puidutööd',
    'Firewood and wood work',
    30,
    true
  ),
  (
    'farm_animal_care',
    'agriculture_forestry',
    'Loomade ja farmi hooldus',
    'Farm and animal care',
    40,
    true
  ),
  (
    'agricultural_machinery_service',
    'agriculture_forestry',
    'Põllumajandustehnika hooldus',
    'Agricultural machinery service',
    50,
    true
  ),

  (
    'accounting',
    'business_digital',
    'Raamatupidamine',
    'Accounting',
    10,
    true
  ),
  (
    'legal_consulting',
    'business_digital',
    'Õigus- ja ärinõustamine',
    'Legal and business consulting',
    20,
    true
  ),
  (
    'marketing_design',
    'business_digital',
    'Turundus ja disain',
    'Marketing and design',
    30,
    true
  ),
  (
    'web_software',
    'business_digital',
    'Veebi- ja tarkvaraarendus',
    'Web and software development',
    40,
    true
  ),
  (
    'it_support',
    'business_digital',
    'IT-tugi ja seadmete hooldus',
    'IT support and device maintenance',
    50,
    true
  ),
  (
    'translation',
    'business_digital',
    'Tõlge ja keeleteenused',
    'Translation and language services',
    60,
    true
  ),

  (
    'catering',
    'events_food',
    'Toitlustus',
    'Catering',
    10,
    true
  ),
  (
    'event_planning',
    'events_food',
    'Ürituste korraldus',
    'Event planning',
    20,
    true
  ),
  (
    'photography_video',
    'events_food',
    'Foto ja video',
    'Photography and video',
    30,
    true
  ),
  (
    'entertainment',
    'events_food',
    'Meelelahutus ja esinejad',
    'Entertainment and performers',
    40,
    true
  ),
  (
    'event_equipment_rental',
    'events_food',
    'Üritustehnika ja inventari rent',
    'Event equipment rental',
    50,
    true
  ),

  (
    'beauty_wellness',
    'personal_family',
    'Ilu ja heaolu',
    'Beauty and wellness',
    10,
    true
  ),
  (
    'fitness_coaching',
    'personal_family',
    'Treening ja juhendamine',
    'Fitness and coaching',
    20,
    true
  ),
  (
    'childcare',
    'personal_family',
    'Lastehoid',
    'Childcare',
    30,
    true
  ),
  (
    'elderly_assistance',
    'personal_family',
    'Eakate abistamine',
    'Elderly assistance',
    40,
    true
  ),
  (
    'pet_services',
    'personal_family',
    'Lemmikloomateenused',
    'Pet services',
    50,
    true
  ),
  (
    'tutoring_training',
    'personal_family',
    'Õpe ja koolitus',
    'Tutoring and training',
    60,
    true
  ),

  (
    'property_management',
    'property_security',
    'Kinnisvara haldus',
    'Property management',
    10,
    true
  ),
  (
    'locksmith',
    'property_security',
    'Lukuabi',
    'Locksmith',
    20,
    true
  ),
  (
    'security_systems',
    'property_security',
    'Turva- ja valvesüsteemid',
    'Security systems',
    30,
    true
  ),
  (
    'real_estate_services',
    'property_security',
    'Kinnisvarateenused',
    'Real estate services',
    40,
    true
  ),
  (
    'inspection_certification',
    'property_security',
    'Kontroll ja sertifitseerimine',
    'Inspection and certification',
    50,
    true
  ),

  (
    'other_service',
    'other_services',
    'Muu teenus',
    'Other service',
    10,
    true
  )
on conflict (code)
do update
set
  parent_code = excluded.parent_code,
  label_et = excluded.label_et,
  label_en = excluded.label_en,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();


create or replace function
  public.is_valid_service_category_pair_v2(
    p_category text,
    p_subcategory text
  )
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    case
      when nullif(
        btrim(
          coalesce(
            p_category,
            ''
          )
        ),
        ''
      ) is null
      then
        nullif(
          btrim(
            coalesce(
              p_subcategory,
              ''
            )
          ),
          ''
        ) is null

      when not exists (
        select 1
        from public.service_categories root_category
        where root_category.code =
          btrim(p_category)
          and root_category.parent_code is null
          and root_category.is_active = true
      )
      then false

      when nullif(
        btrim(
          coalesce(
            p_subcategory,
            ''
          )
        ),
        ''
      ) is null
      then true

      else exists (
        select 1
        from public.service_categories child_category
        where child_category.code =
          btrim(p_subcategory)
          and child_category.parent_code =
            btrim(p_category)
          and child_category.is_active = true
      )
    end;
$function$;

comment on function
  public.is_valid_service_category_pair_v2(
    text,
    text
  )
is
  'Validates a root service category code and an optional direct child code.';

revoke all
on function
  public.is_valid_service_category_pair_v2(
    text,
    text
  )
from public, anon;

grant execute
on function
  public.is_valid_service_category_pair_v2(
    text,
    text
  )
to authenticated, service_role;


create or replace function
  public.validate_service_category_pair_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  new.category :=
    nullif(
      btrim(
        coalesce(
          new.category,
          ''
        )
      ),
      ''
    );

  new.subcategory :=
    nullif(
      btrim(
        coalesce(
          new.subcategory,
          ''
        )
      ),
      ''
    );

  if not public.is_valid_service_category_pair_v2(
    new.category,
    new.subcategory
  ) then
    raise exception
      'Service category selection is invalid.'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

comment on function
  public.validate_service_category_pair_v2()
is
  'Prevents new or updated services from storing unknown or mismatched category codes.';

revoke all
on function
  public.validate_service_category_pair_v2()
from public, anon, authenticated;


drop trigger if exists
  trg_services_validate_category_pair_v2
on public.services;

create trigger
  trg_services_validate_category_pair_v2
before insert or update of
  category,
  subcategory
on public.services
for each row
execute function
  public.validate_service_category_pair_v2();


comment on column
  public.services.category
is
  'Stable root code from public.service_categories.';

comment on column
  public.services.subcategory
is
  'Optional direct child code from public.service_categories.';
