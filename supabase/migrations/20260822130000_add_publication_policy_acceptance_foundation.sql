begin;

create table public.publication_policy_documents (
  id uuid primary key
    default gen_random_uuid(),
  policy_key text not null,
  policy_version text not null,
  country_code text,
  locale text not null
    default 'et-EE',
  title text not null,
  summary text not null
    default '',
  body_text text not null,
  content_hash text not null,
  status text not null
    default 'draft',
  applies_to_content_types text[] not null
    default '{}'::text[],
  requires_user_acceptance boolean not null
    default true,
  effective_from timestamptz not null
    default now(),
  effective_until timestamptz,
  metadata jsonb not null
    default '{}'::jsonb,
  created_at timestamptz not null
    default now(),
  updated_at timestamptz not null
    default now(),

  constraint publication_policy_documents_policy_key_check
    check (
      policy_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    ),

  constraint publication_policy_documents_policy_version_check
    check (
      policy_version ~ '^[a-z0-9][a-z0-9_-]{1,99}$'
    ),

  constraint publication_policy_documents_country_code_check
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  constraint publication_policy_documents_locale_check
    check (
      locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),

  constraint publication_policy_documents_title_check
    check (
      char_length(btrim(title))
        between 2 and 200
    ),

  constraint publication_policy_documents_summary_check
    check (
      char_length(summary) <= 1200
    ),

  constraint publication_policy_documents_body_check
    check (
      char_length(btrim(body_text))
        between 20 and 30000
    ),

  constraint publication_policy_documents_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint publication_policy_documents_status_check
    check (
      status = any (
        array[
          'draft',
          'active',
          'retired'
        ]::text[]
      )
    ),

  constraint publication_policy_documents_content_types_check
    check (
      cardinality(applies_to_content_types) >= 1
      and applies_to_content_types <@
        array[
          'listing',
          'service',
          'product_showcase',
          'job',
          'ad',
          'horse_offer'
        ]::text[]
    ),

  constraint publication_policy_documents_effective_range_check
    check (
      effective_until is null
      or effective_until > effective_from
    ),

  constraint publication_policy_documents_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

comment on table
  public.publication_policy_documents
is
  'Versioned publication rules shown before public content is first published or after a material rule change.';

comment on column
  public.publication_policy_documents.content_hash
is
  'SHA-256 of the exact canonical body_text accepted by the user.';

create unique index
  publication_policy_documents_version_unique_idx
on public.publication_policy_documents (
  policy_key,
  policy_version,
  locale,
  coalesce(country_code, '')
);

create unique index
  publication_policy_documents_one_active_idx
on public.publication_policy_documents (
  policy_key,
  locale,
  coalesce(country_code, '')
)
where status = 'active';

create index
  publication_policy_documents_required_lookup_idx
on public.publication_policy_documents (
  status,
  locale,
  country_code,
  effective_from
);

create trigger
  trg_publication_policy_documents_updated_at
before update
on public.publication_policy_documents
for each row
execute function
  public.set_v2_profile_content_updated_at();

create or replace function
  public.prevent_publication_policy_document_version_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if (
    new.policy_key is distinct from old.policy_key
    or new.policy_version is distinct from old.policy_version
    or new.country_code is distinct from old.country_code
    or new.locale is distinct from old.locale
    or new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.body_text is distinct from old.body_text
    or new.content_hash is distinct from old.content_hash
    or new.applies_to_content_types is distinct from old.applies_to_content_types
    or new.requires_user_acceptance is distinct from old.requires_user_acceptance
  ) then
    raise exception
      'publication_policy_document_version_immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

comment on function
  public.prevent_publication_policy_document_version_mutation()
is
  'Keeps the user-facing accepted text, hash and scope immutable; operational metadata may change without forcing re-acceptance.';

create trigger
  trg_publication_policy_documents_version_immutable
before update
on public.publication_policy_documents
for each row
execute function
  public.prevent_publication_policy_document_version_mutation();

create table public.user_publication_policy_acceptances (
  id uuid primary key
    default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
      on delete cascade,
  identity_id uuid
    references public.identities(id)
      on delete set null,
  policy_document_id uuid not null
    references public.publication_policy_documents(id)
      on delete restrict,
  policy_key text not null,
  policy_version text not null,
  country_code text,
  locale text not null,
  content_hash text not null,
  acceptance_source text not null
    default 'publication_gate',
  accepted_at timestamptz not null
    default now(),
  metadata jsonb not null
    default '{}'::jsonb,

  constraint user_publication_policy_acceptances_unique
    unique (
      user_id,
      policy_document_id
    ),

  constraint user_publication_policy_acceptances_policy_key_check
    check (
      policy_key ~ '^[a-z0-9][a-z0-9_-]{1,79}$'
    ),

  constraint user_publication_policy_acceptances_policy_version_check
    check (
      policy_version ~ '^[a-z0-9][a-z0-9_-]{1,99}$'
    ),

  constraint user_publication_policy_acceptances_country_code_check
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  constraint user_publication_policy_acceptances_locale_check
    check (
      locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),

  constraint user_publication_policy_acceptances_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint user_publication_policy_acceptances_source_check
    check (
      acceptance_source = any (
        array[
          'publication_gate',
          'settings',
          'support',
          'migration'
        ]::text[]
      )
    ),

  constraint user_publication_policy_acceptances_metadata_check
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

comment on table
  public.user_publication_policy_acceptances
is
  'Append-only user-level acceptance history for exact versioned publication policy documents.';

comment on column
  public.user_publication_policy_acceptances.identity_id
is
  'Optional active identity snapshot at acceptance time; the acceptance itself belongs to the authenticated user.';

create or replace function
  public.set_publication_policy_acceptance_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_policy public.publication_policy_documents%rowtype;
begin
  select policy.*
  into v_policy
  from public.publication_policy_documents policy
  where policy.id = new.policy_document_id;

  if not found then
    raise exception
      'publication_policy_document_not_found'
      using errcode = '23503';
  end if;

  new.policy_key :=
    v_policy.policy_key;
  new.policy_version :=
    v_policy.policy_version;
  new.country_code :=
    v_policy.country_code;
  new.locale :=
    v_policy.locale;
  new.content_hash :=
    v_policy.content_hash;

  return new;
end;
$function$;

comment on function
  public.set_publication_policy_acceptance_snapshot()
is
  'Copies immutable policy version fields into each acceptance row before constraints are checked.';

create trigger
  trg_user_publication_policy_acceptances_snapshot
before insert
on public.user_publication_policy_acceptances
for each row
execute function
  public.set_publication_policy_acceptance_snapshot();

create index
  user_publication_policy_acceptances_user_time_idx
on public.user_publication_policy_acceptances (
  user_id,
  accepted_at desc
);

create index
  user_publication_policy_acceptances_policy_idx
on public.user_publication_policy_acceptances (
  policy_document_id,
  accepted_at desc
);

create or replace function
  public.prevent_publication_policy_acceptance_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception
    'publication_policy_acceptance_append_only'
    using errcode = '55000';
end;
$function$;

comment on function
  public.prevent_publication_policy_acceptance_update()
is
  'Prevents acceptance history from being rewritten. Deletion remains available only to privileged account/data lifecycle operations.';

create trigger
  trg_user_publication_policy_acceptances_append_only
before update
on public.user_publication_policy_acceptances
for each row
execute function
  public.prevent_publication_policy_acceptance_update();

insert into public.publication_policy_documents (
  policy_key,
  policy_version,
  country_code,
  locale,
  title,
  summary,
  body_text,
  content_hash,
  status,
  applies_to_content_types,
  requires_user_acceptance,
  effective_from,
  metadata
)
values
  (
    'marketplace-general',
    'marketplace-general-v1',
    null,
    'et-EE',
    'Selqiro kasutamise ja avaldamise reeglid',
    'Üldised reeglid, millega kasutaja nõustub enne oma esimese avaliku sisu avaldamist.',
    $general_policy$Selqiro üldised kasutus- ja avaldamisreeglid

1. Avaldaja vastutab enda avaldatud sisu, andmete, hinna, õiguste ja tehingu õigsuse eest.
2. Avaldada võib ainult sisu, mille avaldamiseks ning pakutava asja, teenuse või õiguse käsutamiseks on kasutajal õigus.
3. Keelatud on ebaseaduslik, petlik, eksitav, teise isiku õigusi rikkuv või Selqiro sisureeglitega vastuolus olev sisu.
4. Selqiro on tehniline vahenduskeskkond ega ole kasutajatevahelise tehingu pool, välja arvatud juhul, kui konkreetse teenuse juures on selgelt teisiti märgitud.
5. Selqirol on õigus tuvastatud või teatatud rikkumise korral sisu nähtavust piirata, sisu peatada või eemaldada ning korduva või raske rikkumise korral kasutajat või identiteeti piirata.
6. Selqiros on keelatud mis tahes avalik sisu, mille eesmärk on eluslooma pakkumine, otsimine, kokkuost, vahendamine või transport tapmiseks, tapamajja saatmiseks, lihaks, nahaks, karusnahaks või muuks tapmise tulemusena saadavaks tooteks kasutamiseks. Keeld hõlmab ka varjatud või eksitava sõnastusega sama eesmärki.
7. Kasutaja peab enne esimest avaldamist ja pärast sisulist reeglimuudatust nõustuma kehtiva reeglite versiooniga.$general_policy$,
    'bd0033c7054b0edb1c19825a63aa0648b867503a7dd2437e9105af2e05387464',
    'active',
    array[
      'listing',
      'service',
      'product_showcase',
      'job',
      'ad',
      'horse_offer'
    ]::text[],
    true,
    now(),
    '{
      "immediate_low_risk_publication": true,
      "risk_based_prepublication_review": true,
      "post_publication_review": true,
      "notice_and_action": true,
      "ai_moderation_mode": "off"
    }'::jsonb
  ),
  (
    'horse-offer-ee',
    'ee-horse-v1',
    'EE',
    'et-EE',
    'Eesti hobusepakkumise avaldamise reeglid',
    'Eesti hobusepakkumiste erireeglid ja avaldaja vastutuse põhimõtted.',
    $horse_policy$Selqiro Eesti hobusepakkumise avaldamise reeglid

1. Eesti piloodis võib avaldada ainult pakkumise, mille tururiik ja hobuse tegelik asukohariik on Eesti.
2. Lubatud pakkumise liigid on müük, tasuta üleandmine, rent või kasutusse andmine, kaasratsaniku otsing ja hobuse otsing.
3. Konkreetset hobust pakkuv avaldaja kinnitab iga pakkumise juures, et ta on vähemalt 18-aastane, hobuse omanik või volitatud esindaja, esitatud andmed on tema parima teadmise järgi õiged ning hobune on nõuetekohaselt identifitseeritud ja passiga.
4. Hobuse otsingukuulutuse puhul ei nõuta omandi ega konkreetse hobuse passi kinnitust.
5. Avaldaja vastutab tehingu, dokumentide, registritoimingute, üleandmise ja võimaliku veo nõuete täitmise eest. Selqiro ei korralda V1-s makset, deposiiti, oksjonit, registritoiminguid ega transporti.
6. Tapmise eesmärgiga sisu üldine keeld kehtib kõigile hobusepakkumistele.
7. Madala riskiga nõuetekohane pakkumine võib avalduda kohe. Selqiro võib riskisignaaliga pakkumise enne avaldamist kinni pidada ning kontrollida avaldatud pakkumisi rikkumisteadete või tuvastatud riskide põhjal.
8. Selqiro ei kontrolli vaikimisi passi, isikut tõendavat dokumenti, omandiõigust, tervislikku seisundit ega kuulutuse faktilist õigsust; avalikus vaates eristatakse avaldaja kinnitusi Selqiro kontrollist.
9. Iga konkreetse pakkumise avaldamisel tuleb anda pakkumise liigile vastavad faktilised kinnitused.$horse_policy$,
    '91d299a51955e2ba9c5ee0e3ff5fe506de4743673975002f13bd4f2d3f45ac23',
    'active',
    array[
      'horse_offer'
    ]::text[],
    true,
    now(),
    '{
      "market_country_code": "EE",
      "horse_location_country_code": "EE",
      "immediate_low_risk_publication": true,
      "universal_admin_prepublication_review": false,
      "risk_based_prepublication_review": true,
      "post_publication_review": true,
      "notice_and_action": true,
      "default_passport_upload": false,
      "default_id_document_check": false,
      "cross_border_flow": false,
      "ai_moderation_mode": "off",
      "supported_offer_types": [
        "sale",
        "free_transfer",
        "lease",
        "co_rider",
        "wanted"
      ]
    }'::jsonb
  );

create or replace function
  public.get_required_publication_policies_v1(
    p_content_type text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns table (
  policy_document_id uuid,
  policy_key text,
  policy_version text,
  country_code text,
  locale text,
  title text,
  summary text,
  body_text text,
  content_hash text,
  requires_user_acceptance boolean,
  metadata jsonb,
  effective_from timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_content_type text :=
    lower(btrim(coalesce(p_content_type, '')));
  v_country_code text :=
    nullif(upper(btrim(coalesce(p_country_code, ''))), '');
  v_locale text :=
    coalesce(nullif(btrim(coalesce(p_locale, '')), ''), 'et-EE');
begin
  if v_content_type = '' then
    raise exception
      'publication_content_type_required'
      using errcode = '22023';
  end if;

  return query
  select
    policy.id,
    policy.policy_key,
    policy.policy_version,
    policy.country_code,
    policy.locale,
    policy.title,
    policy.summary,
    policy.body_text,
    policy.content_hash,
    policy.requires_user_acceptance,
    policy.metadata,
    policy.effective_from
  from public.publication_policy_documents policy
  where policy.status = 'active'
    and policy.locale = v_locale
    and policy.effective_from <= now()
    and (
      policy.effective_until is null
      or policy.effective_until > now()
    )
    and v_content_type = any (
      policy.applies_to_content_types
    )
    and (
      policy.country_code is null
      or (
        v_country_code is not null
        and policy.country_code = v_country_code
      )
    )
  order by
    policy.country_code nulls first,
    policy.policy_key,
    policy.policy_version;
end;
$function$;

comment on function
  public.get_required_publication_policies_v1(text, text, text)
is
  'Returns active versioned rules required for a content type and optional country before publication.';

create or replace function
  public.accept_publication_policy_v1(
    p_policy_document_id uuid,
    p_policy_version text,
    p_content_hash text,
    p_identity_id uuid default null,
    p_acceptance_source text default 'publication_gate'
  )
returns setof public.user_publication_policy_acceptances
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_policy public.publication_policy_documents%rowtype;
  v_identity_id uuid := p_identity_id;
  v_source text :=
    lower(btrim(coalesce(p_acceptance_source, 'publication_gate')));
begin
  if v_user_id is null then
    raise exception
      'not_authenticated'
      using errcode = '42501';
  end if;

  select policy.*
  into v_policy
  from public.publication_policy_documents policy
  where policy.id = p_policy_document_id
    and policy.status = 'active'
    and policy.effective_from <= now()
    and (
      policy.effective_until is null
      or policy.effective_until > now()
    )
  limit 1;

  if not found then
    raise exception
      'publication_policy_not_active'
      using errcode = '22023';
  end if;

  if lower(btrim(coalesce(p_policy_version, ''))) <>
    v_policy.policy_version
  then
    raise exception
      'publication_policy_version_mismatch'
      using errcode = '22023';
  end if;

  if lower(btrim(coalesce(p_content_hash, ''))) <>
    v_policy.content_hash
  then
    raise exception
      'publication_policy_hash_mismatch'
      using errcode = '22023';
  end if;

  if v_source not in (
    'publication_gate',
    'settings'
  ) then
    raise exception
      'publication_policy_acceptance_source_invalid'
      using errcode = '22023';
  end if;

  if v_identity_id is null then
    select profile.active_identity_id
    into v_identity_id
    from public.profiles profile
    where profile.id = v_user_id;
  elsif not public.current_user_has_identity_access(
    v_identity_id
  ) then
    raise exception
      'publication_policy_identity_forbidden'
      using errcode = '42501';
  end if;

  insert into public.user_publication_policy_acceptances (
    user_id,
    identity_id,
    policy_document_id,
    acceptance_source,
    metadata
  )
  values (
    v_user_id,
    v_identity_id,
    v_policy.id,
    v_source,
    jsonb_build_object(
      'requires_user_acceptance',
      v_policy.requires_user_acceptance
    )
  )
  on conflict (
    user_id,
    policy_document_id
  )
  do nothing;

  return query
  select acceptance.*
  from public.user_publication_policy_acceptances acceptance
  where acceptance.user_id = v_user_id
    and acceptance.policy_document_id = v_policy.id
  limit 1;
end;
$function$;

comment on function
  public.accept_publication_policy_v1(uuid, text, text, uuid, text)
is
  'Idempotently records one authenticated user acceptance of the exact active policy document, version and hash.';

create or replace function
  public.get_my_publication_policy_acceptances_v1()
returns table (
  acceptance_id uuid,
  policy_document_id uuid,
  policy_key text,
  policy_version text,
  country_code text,
  locale text,
  content_hash text,
  identity_id uuid,
  acceptance_source text,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception
      'not_authenticated'
      using errcode = '42501';
  end if;

  return query
  select
    acceptance.id,
    acceptance.policy_document_id,
    acceptance.policy_key,
    acceptance.policy_version,
    acceptance.country_code,
    acceptance.locale,
    acceptance.content_hash,
    acceptance.identity_id,
    acceptance.acceptance_source,
    acceptance.accepted_at
  from public.user_publication_policy_acceptances acceptance
  where acceptance.user_id = v_user_id
  order by
    acceptance.accepted_at desc,
    acceptance.id desc;
end;
$function$;

comment on function
  public.get_my_publication_policy_acceptances_v1()
is
  'Returns only the authenticated user acceptance history.';

create or replace function
  public.get_my_required_publication_policy_status_v1(
    p_content_type text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns table (
  policy_document_id uuid,
  policy_key text,
  policy_version text,
  country_code text,
  locale text,
  title text,
  summary text,
  body_text text,
  content_hash text,
  metadata jsonb,
  accepted boolean,
  acceptance_id uuid,
  accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception
      'not_authenticated'
      using errcode = '42501';
  end if;

  return query
  select
    policy.policy_document_id,
    policy.policy_key,
    policy.policy_version,
    policy.country_code,
    policy.locale,
    policy.title,
    policy.summary,
    policy.body_text,
    policy.content_hash,
    policy.metadata,
    acceptance.id is not null,
    acceptance.id,
    acceptance.accepted_at
  from public.get_required_publication_policies_v1(
    p_content_type,
    p_country_code,
    p_locale
  ) policy
  left join public.user_publication_policy_acceptances acceptance
    on acceptance.user_id = v_user_id
    and acceptance.policy_document_id =
      policy.policy_document_id
  order by
    policy.country_code nulls first,
    policy.policy_key,
    policy.policy_version;
end;
$function$;

comment on function
  public.get_my_required_publication_policy_status_v1(text, text, text)
is
  'Combines required active policy documents with the authenticated user acceptance state for a publication gate.';

create or replace function
  public.has_my_current_publication_policy_acceptance_v1(
    p_policy_key text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.publication_policy_documents policy
      join public.user_publication_policy_acceptances acceptance
        on acceptance.policy_document_id = policy.id
        and acceptance.user_id = auth.uid()
      where policy.policy_key =
        lower(btrim(coalesce(p_policy_key, '')))
        and policy.country_code is not distinct from
          nullif(upper(btrim(coalesce(p_country_code, ''))), '')
        and policy.locale =
          coalesce(nullif(btrim(coalesce(p_locale, '')), ''), 'et-EE')
        and policy.status = 'active'
        and policy.effective_from <= now()
        and (
          policy.effective_until is null
          or policy.effective_until > now()
        )
        and acceptance.content_hash = policy.content_hash
    );
$function$;

comment on function
  public.has_my_current_publication_policy_acceptance_v1(text, text, text)
is
  'Checks whether the authenticated user accepted the active exact version for one policy key and country scope.';

create or replace function
  public.require_my_current_publication_policy_acceptance_v1(
    p_policy_key text,
    p_country_code text default null,
    p_locale text default 'et-EE'
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_policy_id uuid;
begin
  if v_user_id is null then
    raise exception
      'not_authenticated'
      using errcode = '42501';
  end if;

  select policy.id
  into v_policy_id
  from public.publication_policy_documents policy
  join public.user_publication_policy_acceptances acceptance
    on acceptance.policy_document_id = policy.id
    and acceptance.user_id = v_user_id
  where policy.policy_key =
      lower(btrim(coalesce(p_policy_key, '')))
    and policy.country_code is not distinct from
      nullif(upper(btrim(coalesce(p_country_code, ''))), '')
    and policy.locale =
      coalesce(nullif(btrim(coalesce(p_locale, '')), ''), 'et-EE')
    and policy.status = 'active'
    and policy.effective_from <= now()
    and (
      policy.effective_until is null
      or policy.effective_until > now()
    )
    and acceptance.content_hash = policy.content_hash
  limit 1;

  if v_policy_id is null then
    raise exception
      'publication_policy_acceptance_required:%',
      lower(btrim(coalesce(p_policy_key, '')))
      using errcode = '42501';
  end if;

  return v_policy_id;
end;
$function$;

comment on function
  public.require_my_current_publication_policy_acceptance_v1(text, text, text)
is
  'Reusable server-side publication guard that raises when the current user has not accepted the active policy version.';

alter table
  public.publication_policy_documents
  enable row level security;

alter table
  public.user_publication_policy_acceptances
  enable row level security;

create policy
  "active publication policy documents public read"
on public.publication_policy_documents
for select
to anon, authenticated
using (
  status = 'active'
  and effective_from <= now()
  and (
    effective_until is null
    or effective_until > now()
  )
);

revoke all
on table public.publication_policy_documents
from public, anon, authenticated;

grant select
on table public.publication_policy_documents
to anon, authenticated;

grant all
on table public.publication_policy_documents
to service_role;

revoke all
on table public.user_publication_policy_acceptances
from public, anon, authenticated;

grant all
on table public.user_publication_policy_acceptances
to service_role;

revoke all
on function
  public.get_required_publication_policies_v1(text, text, text)
from public;

grant execute
on function
  public.get_required_publication_policies_v1(text, text, text)
to anon, authenticated, service_role;

revoke all
on function
  public.accept_publication_policy_v1(uuid, text, text, uuid, text)
from public, anon;

grant execute
on function
  public.accept_publication_policy_v1(uuid, text, text, uuid, text)
to authenticated, service_role;

revoke all
on function
  public.get_my_publication_policy_acceptances_v1()
from public, anon;

grant execute
on function
  public.get_my_publication_policy_acceptances_v1()
to authenticated, service_role;

revoke all
on function
  public.get_my_required_publication_policy_status_v1(text, text, text)
from public, anon;

grant execute
on function
  public.get_my_required_publication_policy_status_v1(text, text, text)
to authenticated, service_role;

revoke all
on function
  public.has_my_current_publication_policy_acceptance_v1(text, text, text)
from public, anon;

grant execute
on function
  public.has_my_current_publication_policy_acceptance_v1(text, text, text)
to authenticated, service_role;

revoke all
on function
  public.require_my_current_publication_policy_acceptance_v1(text, text, text)
from public, anon;

grant execute
on function
  public.require_my_current_publication_policy_acceptance_v1(text, text, text)
to authenticated, service_role;

commit;
